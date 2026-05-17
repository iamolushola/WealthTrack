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
    const rows = await this.mysql.selectMany<UploadPreviewRow>(
      'SELECT * FROM upload_batch_rows WHERE upload_batch_id = ? AND row_status = ? ORDER BY csv_row_number ASC',
      [data.batchId, 'valid'],
    );

    let importedCount = 0;
    for (const row of rows) {
      const existing = row.investmentReference
        ? await this.mysql.selectOne<{ id: string }>('SELECT id FROM investment_records WHERE investment_reference = ? LIMIT 1', [
            row.investmentReference,
          ])
        : null;

      if (existing) {
        continue;
      }

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
      importedCount += 1;
    }

    await this.mysql.execute('UPDATE upload_batches SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?', [
      importedCount > 0 ? 'imported' : 'partially_imported',
      nowIso(),
      nowIso(),
      data.batchId,
    ]);

    this.logger.log(`Processed ${jobName} for import batch ${data.batchId}`);
    return { status: importedCount > 0 ? 'imported' : 'partially_imported', batchId: data.batchId, importedCount };
  }
}
