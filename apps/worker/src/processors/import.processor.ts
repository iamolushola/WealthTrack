import { Injectable, Logger } from '@nestjs/common';
import { ConfirmImportJob, IMPORT_QUEUE } from '../queues/import.queue';
import { UploadPreviewRow } from '@wealthtrack/shared-types';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { createId, nowIso } from '../common/utils/ids';
import { QueueProcessor } from './processor.interface';

@Injectable()
export class ImportProcessor implements QueueProcessor<ConfirmImportJob> {
  readonly queueName = IMPORT_QUEUE;
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(private readonly mysql: MysqlWorkerService) {}

  async handle(jobName: string, data: ConfirmImportJob): Promise<{ status: string; batchId: string; importedCount: number }> {
    // Mark as importing (only if currently validated or partially_imported so re-runs are safe)
    await this.mysql.execute(
      "UPDATE upload_batches SET status = 'importing', updated_at = ? WHERE id = ? AND status IN ('validated', 'partially_imported')",
      [nowIso(), data.batchId],
    );

    const rows = await this.mysql.selectMany<UploadPreviewRow>(
      'SELECT * FROM upload_batch_rows WHERE upload_batch_id = ? AND row_status = ? ORDER BY csv_row_number ASC',
      [data.batchId, 'valid'],
    );

    if (rows.length === 0) {
      await this.mysql.execute(
        "UPDATE upload_batches SET status = 'imported', updated_at = ?, completed_at = ? WHERE id = ?",
        [nowIso(), nowIso(), data.batchId],
      );
      return { status: 'imported', batchId: data.batchId, importedCount: 0 };
    }

    // Bulk-load all investment_references already in the DB for this batch's references.
    // This avoids N+1 queries and eliminates race-condition skips.
    const refs = rows.map((r) => r.investmentReference).filter(Boolean) as string[];
    let existingRefs = new Set<string>();
    if (refs.length > 0) {
      const placeholders = refs.map(() => '?').join(',');
      const existing = await this.mysql.selectMany<{ investment_reference: string }>(
        `SELECT investment_reference FROM investment_records WHERE investment_reference IN (${placeholders})`,
        refs,
      );
      existingRefs = new Set(existing.map((r) => r.investment_reference));
    }

    let importedCount = 0;
    for (const row of rows) {
      // Skip rows whose reference is already in the DB
      if (row.investmentReference && existingRefs.has(row.investmentReference)) {
        continue;
      }

      try {
        await this.mysql.execute(
          'INSERT INTO investment_records SET ?',
          [
            {
              id: createId(),
              customerId: row.customerId ?? 'unknown',
              customerName: row.customerName ?? 'Unknown Customer',
              customerType: row.customerType ?? 'returning',
              mobilisationDate: row.mobilisationDate ?? nowIso().slice(0, 10),
              investmentAmount: row.investmentAmount ?? '0.0000',
              fundType: row.fundType ?? 'inflow',
              tenorDays: row.tenorDays ?? 30,
              tenorCategory: row.tenorCategory ?? 'unclassified',
              maturityDate: row.maturityDate,
              investmentReference: row.investmentReference,
              currency: row.currency,
              sourceChannel: row.sourceChannel,
              relationshipManager: row.relationshipManager,
              costOfFunds: row.costOfFunds,
              importBatchId: data.batchId,
              uploadBatchRowId: row.id,
              syncBatchId: null,
              dataSource: 'csv_upload',
              importStatus: 'confirmed',
              recordStatus: 'valid',
              sourceRecordHash: row.sourceRecordHash,
              confirmedBy: data.actorId,
              confirmedAt: nowIso(),
              createdAt: nowIso(),
              updatedAt: nowIso(),
              createdBy: data.actorId,
              updatedBy: data.actorId,
            },
          ],
        );
        // Track newly inserted ref so subsequent rows in this batch are also deduplicated
        if (row.investmentReference) {
          existingRefs.add(row.investmentReference);
        }
        importedCount += 1;
      } catch (rowError) {
        const msg = rowError instanceof Error ? rowError.message : String(rowError);
        this.logger.warn(`Skipped row ${row.csvRowNumber ?? '?'} (ref: ${row.investmentReference ?? 'none'}): ${msg}`);
      }
    }

    const totalExpected = rows.length;
    const totalNow = importedCount + existingRefs.size;
    const finalStatus = totalNow >= totalExpected ? 'imported' : importedCount > 0 ? 'partially_imported' : 'imported';
    await this.mysql.execute('UPDATE upload_batches SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?', [
      finalStatus,
      nowIso(),
      nowIso(),
      data.batchId,
    ]);

    this.logger.log(`Processed ${jobName} for batch ${data.batchId}: inserted ${importedCount}, skipped ${totalExpected - importedCount}`);
    return { status: finalStatus, batchId: data.batchId, importedCount };
  }
}
