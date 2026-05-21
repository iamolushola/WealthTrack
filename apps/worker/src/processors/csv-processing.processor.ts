import { Injectable, Logger } from '@nestjs/common';
import { UploadBatchRow, UploadPreviewRow, UploadValidationErrorRow } from '@wealthtrack/shared-types';
import { ProcessCsvUploadJob, CSV_PROCESSING_QUEUE } from '../queues/csv-processing.queue';
import { FileStorageService } from '../common/file-storage.service';
import { parseCsv } from '../common/csv-parser';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { createId, nowIso } from '../common/utils/ids';
import { QueueProcessor } from './processor.interface';

const HEADER_ALIASES: Record<string, string> = {
  investment_id: 'investment_reference',
  user_id: 'customer_id',
  customer_name: 'customer_name',
  amout: 'investment_amount',
  amount: 'investment_amount',
  tenure: 'tenor_days',
  creation_date: 'mobilisation_date',
  maturity_date: 'maturity_date',
  maturiry_date: 'maturity_date',
  customer_class: 'customer_type',
  funds_class: 'fund_type',
  act_officer: 'relationship_manager',
  channel: 'source_channel',
};

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

    try {
      const content = await this.fileStorageService.readCsv(batch.fileUrl);
      const parsedRows = parseCsv(content);
      const previewRows: UploadPreviewRow[] = [];
      const validationErrors: UploadValidationErrorRow[] = [];
      const seenReferences = new Set<string>();

      for (const parsedRow of parsedRows) {
        const values = this.normalizeValues(parsedRow.values);
        const customerType = this.normalizeCustomerType(values.customer_type);
        const fundType = this.normalizeFundType(values.fund_type, values.inflow, values.rollover);
        const tenorDays = this.parsePositiveInteger(values.tenor_days);
        const investmentAmount = this.normalizeMoney(values.investment_amount);
        const mobilisationDate = this.normalizeDate(values.mobilisation_date);
        const maturityDate = this.normalizeDate(values.maturity_date);
        const investmentReference = values.investment_reference || null;
        const validationFailures: Array<[string, string, string | null]> = [];

        [
          ['customer_id', values.customer_id],
          // customer_name is optional — import processor defaults to 'Unknown Customer' when absent
          ['mobilisation_date', values.mobilisation_date],
          ['investment_amount', values.investment_amount],
          ['fund_type', values.fund_type],
          ['tenor_days', values.tenor_days],
        ].forEach(([fieldName, value]) => {
          if (!value) {
            validationFailures.push([fieldName, 'required', value || null]);
          }
        });

        if (values.customer_type && !customerType) {
          validationFailures.push(['customer_type', 'invalid_enum', values.customer_type]);
        }

        if (values.fund_type && !fundType) {
          validationFailures.push(['fund_type', 'invalid_enum', values.fund_type]);
        }

        if (values.tenor_days && tenorDays === null) {
          validationFailures.push(['tenor_days', 'invalid_number', values.tenor_days]);
        }

        if (values.investment_amount && investmentAmount === null) {
          validationFailures.push(['investment_amount', 'invalid_number', values.investment_amount]);
        }

        if (values.mobilisation_date && mobilisationDate === null) {
          validationFailures.push(['mobilisation_date', 'invalid_date', values.mobilisation_date]);
        }

        if (values.maturity_date && maturityDate === null) {
          validationFailures.push(['maturity_date', 'invalid_date', values.maturity_date]);
        }

        let rowStatus: UploadPreviewRow['rowStatus'] = validationFailures.length > 0 ? 'invalid' : 'valid';
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
          customerId: values.customer_id || null,
          customerName: values.customer_name || null,
          customerType,
          mobilisationDate,
          investmentAmount,
          fundType,
          tenorDays,
          tenorCategory: tenorDays ? this.classifyTenor(tenorDays) : null,
          maturityDate,
          investmentReference,
          currency: values.currency || 'NGN',
          sourceChannel: values.source_channel || null,
          relationshipManager: values.relationship_manager || null,
          costOfFunds: this.normalizeMoney(values.cost_of_funds),
          sourceRecordHash: investmentReference,
          rowStatus,
          rawPayloadJson: parsedRow.values,
          normalizedPayloadJson: values,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        previewRows.push(previewRow);

        for (const [fieldName, errorCode, originalValue] of validationFailures) {
          validationErrors.push({
            id: createId(),
            uploadBatchId: data.batchId,
            uploadBatchRowId: previewRow.id,
            csvRowNumber: parsedRow.rowNumber,
            fieldName,
            errorCode,
            errorMessage: `${fieldName} failed ${errorCode} validation`,
            originalValue,
            createdAt: nowIso(),
          });
        }
      }

      await this.mysql.execute('DELETE FROM upload_validation_errors WHERE upload_batch_id = ?', [data.batchId]);
      await this.mysql.execute('DELETE FROM upload_batch_rows WHERE upload_batch_id = ?', [data.batchId]);

      for (const row of previewRows) {
        await this.mysql.execute('INSERT INTO upload_batch_rows SET ?', [row]);
      }

      for (const error of validationErrors) {
        await this.mysql.execute('INSERT INTO upload_validation_errors SET ?', [error]);
      }

      const validRows = previewRows.filter((row) => row.rowStatus === 'valid').length;
      const duplicateRows = previewRows.filter((row) => row.rowStatus === 'duplicate').length;
      const invalidRows = previewRows.filter((row) => row.rowStatus === 'invalid').length;

      await this.mysql.execute(
        'UPDATE upload_batches SET status = ?, total_rows = ?, valid_rows = ?, invalid_rows = ?, duplicate_rows = ?, completed_at = ?, updated_at = ? WHERE id = ?',
        ['validated', previewRows.length, validRows, invalidRows, duplicateRows, nowIso(), nowIso(), data.batchId],
      );

      this.logger.log(`Processed ${jobName} for batch ${data.batchId}`);
      return { status: 'validated', batchId: data.batchId, validRows };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown CSV processing error';
      this.logger.error(`Failed to process ${jobName} for batch ${data.batchId}: ${message}`);
      await this.mysql.execute('UPDATE upload_batches SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?', [
        'failed',
        nowIso(),
        nowIso(),
        data.batchId,
      ]);
      throw error;
    }
  }

  private normalizeValues(values: Record<string, string>): Record<string, string> {
    return Object.entries(values).reduce<Record<string, string>>((result, [header, value]) => {
      const normalizedHeader = this.normalizeHeader(header);
      const targetHeader = HEADER_ALIASES[normalizedHeader] ?? normalizedHeader;
      if (targetHeader) {
        result[targetHeader] = value.trim();
      }
      return result;
    }, {});
  }

  private normalizeHeader(header: string): string {
    return header
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeCustomerType(value: string | undefined): UploadPreviewRow['customerType'] {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('ntb') || normalized.includes('new')) return 'new';
    if (normalized.includes('retn') || normalized.includes('return')) return 'returning';
    return null;
  }

  private normalizeFundType(value: string | undefined, inflow?: string, rollover?: string): UploadPreviewRow['fundType'] {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized.includes('infl') || normalized.includes('inflow')) return 'inflow';
    if (normalized.includes('retn') || normalized.includes('roll')) return 'rollover';

    const inflowAmount = this.normalizeMoney(inflow);
    const rolloverAmount = this.normalizeMoney(rollover);
    if (Number(inflowAmount ?? 0) > 0) return 'inflow';
    if (Number(rolloverAmount ?? 0) > 0) return 'rollover';
    return null;
  }

  private normalizeMoney(value: string | undefined): string | null {
    const cleaned = (value ?? '').replace(/,/g, '').trim();
    if (!cleaned) return null;
    const amount = Number(cleaned);
    if (!Number.isFinite(amount)) return null;
    return amount.toFixed(4);
  }

  private parsePositiveInteger(value: string | undefined): number | null {
    const cleaned = (value ?? '').replace(/,/g, '').trim();
    if (!cleaned) return null;
    const amount = Number(cleaned);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.round(amount);
  }

  private normalizeDate(value: string | undefined): string | null {
    const cleaned = (value ?? '').trim();
    if (!cleaned) return null;

    // YYYY-MM-DD (ISO)
    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // MM/DD/YYYY (4-digit year, optional time)
    const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const month = slashMatch[1].padStart(2, '0');
      const day = slashMatch[2].padStart(2, '0');
      return `${slashMatch[3]}-${month}-${day}`;
    }

    // MM/DD/YY or MM/DD/YY HH:MM:SS (2-digit year, Google Sheets export format)
    const shortSlashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})(\s|$)/);
    if (shortSlashMatch) {
      const month = shortSlashMatch[1].padStart(2, '0');
      const day = shortSlashMatch[2].padStart(2, '0');
      const yy = parseInt(shortSlashMatch[3], 10);
      const year = yy <= 50 ? 2000 + yy : 1900 + yy;
      return `${year}-${month}-${day}`;
    }

    return null;
  }
}
