import { Injectable, Logger } from '@nestjs/common';
import { UploadBatchRow, UploadPreviewRow, UploadValidationErrorRow } from '@wealthtrack/shared-types';
import { ProcessCsvUploadJob, CSV_PROCESSING_QUEUE } from '../queues/csv-processing.queue';
import { FileStorageService } from '../common/file-storage.service';
import { parseCsv } from '../common/csv-parser';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { createId, nowIso } from '../common/utils/ids';
import { QueueProcessor } from './processor.interface';

@Injectable()
export class CsvProcessingProcessor implements QueueProcessor<ProcessCsvUploadJob> {
  readonly queueName = CSV_PROCESSING_QUEUE;
  private readonly logger = new Logger(CsvProcessingProcessor.name);

  constructor(
    private readonly mysql: MysqlWorkerService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  private classifyTenor(tenorDays: number): UploadPreviewRow['tenorCategory'] {
    if (tenorDays >= 30 && tenorDays <= 120) {
      return 'short_term';
    }

    if (tenorDays >= 150 && tenorDays <= 210) {
      return 'mid_short_term';
    }

    if (tenorDays >= 240 && tenorDays <= 360) {
      return 'medium_term';
    }

    if (tenorDays >= 390 && tenorDays <= 480) {
      return 'long_term';
    }

    return 'unclassified';
  }

  async handle(jobName: string, data: ProcessCsvUploadJob): Promise<{ status: string; batchId: string; validRows: number }> {
    const batch = await this.mysql.selectOne<UploadBatchRow>('SELECT * FROM upload_batches WHERE id = ? LIMIT 1', [data.batchId]);
    if (!batch) {
      throw new Error(`Upload batch ${data.batchId} not found`);
    }

    await this.mysql.execute('UPDATE upload_batches SET status = ?, processing_started_at = ?, updated_at = ? WHERE id = ?', [
      'processing',
      nowIso(),
      nowIso(),
      data.batchId,
    ]);

    const content = await this.fileStorageService.readCsv(batch.fileUrl);
    const parsedRows = parseCsv(content);
    const previewRows: UploadPreviewRow[] = [];
    const validationErrors: UploadValidationErrorRow[] = [];
    const seenReferences = new Set<string>();

    for (const parsedRow of parsedRows) {
      const customerType = parsedRow.values.customer_type as UploadPreviewRow['customerType'];
      const fundType = parsedRow.values.fund_type as UploadPreviewRow['fundType'];
      const tenorDays = Number(parsedRow.values.tenor_days || 0);
      const investmentReference = parsedRow.values.investment_reference || null;
      const requiredFailures: Array<[string, string]> = [];

      ['customer_id', 'customer_name', 'mobilisation_date', 'investment_amount', 'fund_type', 'tenor_days'].forEach((fieldName) => {
        if (!parsedRow.values[fieldName]) {
          requiredFailures.push([fieldName, 'required']);
        }
      });

      if (customerType && customerType !== 'new' && customerType !== 'returning') {
        requiredFailures.push(['customer_type', 'invalid_enum']);
      }

      if (fundType && fundType !== 'inflow' && fundType !== 'rollover') {
        requiredFailures.push(['fund_type', 'invalid_enum']);
      }

      if (Number.isNaN(tenorDays) || tenorDays <= 0) {
        requiredFailures.push(['tenor_days', 'invalid_number']);
      }

      let rowStatus: UploadPreviewRow['rowStatus'] = requiredFailures.length > 0 ? 'invalid' : 'valid';
      if (investmentReference && seenReferences.has(investmentReference)) {
        rowStatus = 'duplicate';
      }
      if (investmentReference) {
        seenReferences.add(investmentReference);
      }

      const previewRow: UploadPreviewRow = {
        id: createId(),
        uploadBatchId: data.batchId,
        csvRowNumber: parsedRow.rowNumber,
        customerId: parsedRow.values.customer_id || null,
        customerName: parsedRow.values.customer_name || null,
        customerType: customerType || null,
        mobilisationDate: parsedRow.values.mobilisation_date || null,
        investmentAmount: parsedRow.values.investment_amount || null,
        fundType: fundType || null,
        tenorDays: tenorDays || null,
        tenorCategory: tenorDays ? this.classifyTenor(tenorDays) : null,
        maturityDate: parsedRow.values.maturity_date || null,
        investmentReference,
        currency: parsedRow.values.currency || 'NGN',
        sourceChannel: parsedRow.values.source_channel || null,
        relationshipManager: parsedRow.values.relationship_manager || null,
        costOfFunds: parsedRow.values.cost_of_funds || null,
        sourceRecordHash: investmentReference,
        rowStatus,
        rawPayloadJson: parsedRow.values,
        normalizedPayloadJson: parsedRow.values,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      previewRows.push(previewRow);

      for (const [fieldName, errorCode] of requiredFailures) {
        validationErrors.push({
          id: createId(),
          uploadBatchId: data.batchId,
          uploadBatchRowId: previewRow.id,
          csvRowNumber: parsedRow.rowNumber,
          fieldName,
          errorCode,
          errorMessage: `${fieldName} failed ${errorCode} validation`,
          originalValue: parsedRow.values[fieldName] || null,
          createdAt: nowIso(),
        });
      }
    }

    await this.mysql.execute('DELETE FROM upload_validation_errors WHERE upload_batch_id = ?', [data.batchId]);
    await this.mysql.execute('DELETE FROM upload_batch_rows WHERE upload_batch_id = ?', [data.batchId]);

    await Promise.all(previewRows.map((row) => this.mysql.execute('INSERT INTO upload_batch_rows SET ?', [row])));
    await Promise.all(validationErrors.map((error) => this.mysql.execute('INSERT INTO upload_validation_errors SET ?', [error])));

    const validRows = previewRows.filter((row) => row.rowStatus === 'valid').length;
    const duplicateRows = previewRows.filter((row) => row.rowStatus === 'duplicate').length;
    const invalidRows = previewRows.filter((row) => row.rowStatus === 'invalid').length;

    await this.mysql.execute(
      'UPDATE upload_batches SET status = ?, total_rows = ?, valid_rows = ?, invalid_rows = ?, duplicate_rows = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      ['validated', previewRows.length, validRows, invalidRows, duplicateRows, nowIso(), nowIso(), data.batchId],
    );

    this.logger.log(`Processed ${jobName} for batch ${data.batchId}`);
    return { status: 'validated', batchId: data.batchId, validRows };
  }
}
