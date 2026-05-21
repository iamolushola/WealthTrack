import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  GoogleSheetsSyncJob,
  GOOGLE_SHEETS_SYNC_QUEUE,
  GoogleSheetTabRow,
  IntegrationSourceRow,
} from '@wealthtrack/shared-types';
import { QueueProcessor } from './processor.interface';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { GoogleSheetsClientService } from '../common/google-sheets-client.service';
import { createId, nowIso } from '../common/utils/ids';
import type { sheets_v4 } from 'googleapis';

@Injectable()
export class GoogleSheetsSyncProcessor implements QueueProcessor<GoogleSheetsSyncJob> {
  readonly queueName = GOOGLE_SHEETS_SYNC_QUEUE;
  private readonly logger = new Logger(GoogleSheetsSyncProcessor.name);

  constructor(
    private readonly mysql: MysqlWorkerService,
    private readonly sheetsClient: GoogleSheetsClientService,
  ) {}

  async handle(
    jobName: string,
    data: GoogleSheetsSyncJob,
  ): Promise<{ status: string; syncBatchId: string; valid: number; invalid: number; skipped: number }> {
    const source = await this.mysql.selectOne<IntegrationSourceRow>(
      'SELECT * FROM integration_sources WHERE id = ? LIMIT 1',
      [data.integrationSourceId],
    );
    if (!source) throw new Error(`Integration source ${data.integrationSourceId} not found`);

    await this.mysql.execute('UPDATE sync_batches SET status = ?, updated_at = ? WHERE id = ?', [
      'running',
      nowIso(),
      data.syncBatchId,
    ]);

    const rawSecret = process.env[`SECRET_${source.secretRef.replace(/-/g, '_').toUpperCase()}`]
      ?? source.secretRef;
    const credentials = this.sheetsClient.parseCredentials(rawSecret);
    const client = await this.sheetsClient.buildSheets(credentials);
    const config = source.connectionConfig as { spreadsheetId: string };

    // Resolve which tabs to process
    const tabs =
      data.tabIds.length > 0
        ? await this.mysql.selectMany<GoogleSheetTabRow>(
            `SELECT * FROM google_sheet_tabs WHERE integration_source_id = ? AND id IN (${data.tabIds.map(() => '?').join(',')}) AND status = 'active'`,
            [data.integrationSourceId, ...data.tabIds],
          )
        : await this.mysql.selectMany<GoogleSheetTabRow>(
            `SELECT * FROM google_sheet_tabs WHERE integration_source_id = ? AND status = 'active'`,
            [data.integrationSourceId],
          );

    let totalValid = 0;
    let totalInvalid = 0;
    let totalSkipped = 0;

    for (const tab of tabs) {
      const result = await this.processTab(client, config.spreadsheetId, tab, data.syncBatchId, data.actorId);
      totalValid += result.valid;
      totalInvalid += result.invalid;
      totalSkipped += result.skipped;

      await this.mysql.execute(
        'UPDATE google_sheet_tabs SET last_synced_at = ?, last_row_count = ?, updated_at = ? WHERE id = ?',
        [nowIso(), result.valid + result.invalid, nowIso(), tab.id],
      );
    }

    const finalStatus = totalInvalid > 0 ? 'partial_success' : 'success';

    await this.mysql.execute(
      `UPDATE sync_batches
         SET status = ?, total_records = ?, valid_records = ?,
             invalid_records = ?, skipped_records = ?,
             completed_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        finalStatus,
        totalValid + totalInvalid,
        totalValid,
        totalInvalid,
        totalSkipped,
        nowIso(),
        nowIso(),
        data.syncBatchId,
      ],
    );

    // Advance last_successful_sync_at on the source if fully successful
    if (finalStatus === 'success') {
      await this.mysql.execute(
        'UPDATE integration_sources SET last_successful_sync_at = ?, updated_at = ? WHERE id = ?',
        [nowIso(), nowIso(), data.integrationSourceId],
      );
    }

    this.logger.log(
      `Processed ${jobName} — batch ${data.syncBatchId}: valid=${totalValid} invalid=${totalInvalid} skipped=${totalSkipped}`,
    );
    return { status: finalStatus, syncBatchId: data.syncBatchId, valid: totalValid, invalid: totalInvalid, skipped: totalSkipped };
  }

  // ── Tab-level processing ──────────────────────────────────────────────────

  private async processTab(
    client: sheets_v4.Sheets,
    spreadsheetId: string,
    tab: GoogleSheetTabRow,
    syncBatchId: string,
    actorId: string,
  ): Promise<{ valid: number; invalid: number; skipped: number }> {
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tab.sheetTitle}'!${tab.rangeNotation}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const rows: unknown[][] = (response.data.values as unknown[][] | undefined) ?? [];
    if (rows.length < 2) return { valid: 0, invalid: 0, skipped: 0 };

    const [headerRow, ...dataRows] = rows as string[][];
    const columnMapping: Record<string, string> = tab.columnMapping ?? {};

    // Build { colIndex → internal field name }
    const headerIndex: Record<number, string> = {};
    headerRow.forEach((header, idx) => {
      const field =
        columnMapping[header] ??
        columnMapping[String(idx)] ??
        this.snakeCase(String(header ?? ''));
      if (field) headerIndex[idx] = field;
    });

    let valid = 0;
    let invalid = 0;
    let skipped = 0;

    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const rawRow = dataRows[rowIdx];
      if (!rawRow || rawRow.every((c) => c === null || c === undefined || c === '')) {
        skipped++;
        continue;
      }

      const mapped: Record<string, unknown> = {};
      rawRow.forEach((cell, colIdx) => {
        const field = headerIndex[colIdx];
        if (field) mapped[field] = cell;
      });

      const rowChecksum = createHash('sha256').update(JSON.stringify(rawRow)).digest('hex');
      const actualRowIndex = rowIdx + 1; // 1-based data row index (0 = header)

      // Skip unchanged rows
      const existing = await this.mysql.selectOne<{ row_checksum: string; id: string; investment_record_id: string | null }>(
        'SELECT id, row_checksum, investment_record_id FROM google_sheet_row_checksums WHERE sheet_tab_id = ? AND row_index = ? LIMIT 1',
        [tab.id, actualRowIndex],
      );

      if (existing?.row_checksum === rowChecksum) {
        skipped++;
        continue;
      }

      // Validate required fields
      const required = ['customer_id', 'customer_name', 'mobilisation_date', 'investment_amount', 'fund_type', 'tenor_days'];
      const missingFields = required.filter((f) => !mapped[f]);

      if (missingFields.length > 0) {
        await this.mysql.execute('INSERT INTO sync_batch_errors SET ?', [
          {
            id: createId(),
            syncBatchId,
            sourceRecordIdentifier: `${tab.sheetTitle}:row:${actualRowIndex}`,
            errorCode: 'validation_failed',
            errorMessage: `Missing required fields: ${missingFields.join(', ')}`,
            rawPayloadJson: mapped,
            createdAt: nowIso(),
          },
        ]);
        invalid++;
        continue;
      }

      const tenorDays = Number(mapped.tenor_days ?? 0);
      const investmentRef = mapped.investment_reference ? String(mapped.investment_reference) : null;

      const existingRecord = investmentRef
        ? await this.mysql.selectOne<{ id: string }>(
            'SELECT id FROM investment_records WHERE investment_reference = ? LIMIT 1',
            [investmentRef],
          )
        : null;

      const recordId = existingRecord?.id ?? createId();

      if (existingRecord) {
        await this.mysql.execute(
          `UPDATE investment_records
             SET customer_name = ?, investment_amount = ?, tenor_days = ?,
                 maturity_date = ?, source_record_hash = ?, sync_batch_id = ?,
                 data_source = 'google_sheets', updated_at = ?, updated_by = ?
           WHERE id = ?`,
          [
            String(mapped.customer_name),
            String(mapped.investment_amount),
            tenorDays,
            mapped.maturity_date ? String(mapped.maturity_date) : null,
            rowChecksum,
            syncBatchId,
            nowIso(),
            actorId,
            recordId,
          ],
        );
      } else {
        await this.mysql.execute('INSERT INTO investment_records SET ?', [
          {
            id: recordId,
            customerId: String(mapped.customer_id),
            customerName: String(mapped.customer_name),
            customerType: mapped.customer_type === 'new' ? 'new' : 'returning',
            mobilisationDate: String(mapped.mobilisation_date),
            investmentAmount: String(mapped.investment_amount),
            fundType: mapped.fund_type === 'rollover' ? 'rollover' : 'inflow',
            tenorDays,
            tenorCategory: this.classifyTenor(tenorDays),
            maturityDate: mapped.maturity_date ? String(mapped.maturity_date) : null,
            investmentReference: investmentRef,
            currency: mapped.currency ? String(mapped.currency) : 'NGN',
            sourceChannel: mapped.source_channel ? String(mapped.source_channel) : null,
            relationshipManager: mapped.relationship_manager ? String(mapped.relationship_manager) : null,
            costOfFunds: mapped.cost_of_funds ? String(mapped.cost_of_funds) : null,
            importBatchId: null,
            uploadBatchRowId: null,
            syncBatchId,
            dataSource: 'google_sheets',
            importStatus: 'confirmed',
            recordStatus: 'valid',
            sourceRecordHash: rowChecksum,
            confirmedBy: actorId,
            confirmedAt: nowIso(),
            createdAt: nowIso(),
            updatedAt: nowIso(),
            createdBy: actorId,
            updatedBy: actorId,
          },
        ]);
      }

      // Upsert row checksum
      if (existing) {
        await this.mysql.execute(
          'UPDATE google_sheet_row_checksums SET row_checksum = ?, investment_record_id = ?, synced_at = ? WHERE id = ?',
          [rowChecksum, recordId, nowIso(), existing.id],
        );
      } else {
        await this.mysql.execute('INSERT INTO google_sheet_row_checksums SET ?', [
          {
            id: createId(),
            sheetTabId: tab.id,
            rowIndex: actualRowIndex,
            rowChecksum,
            investmentRecordId: recordId,
            syncedAt: nowIso(),
          },
        ]);
      }

      valid++;
    }

    return { valid, invalid, skipped };
  }

  private classifyTenor(days: number): string {
    if (days >= 30 && days <= 120) return 'short_term';
    if (days >= 150 && days <= 210) return 'mid_short_term';
    if (days >= 240 && days <= 360) return 'medium_term';
    if (days >= 390 && days <= 480) return 'long_term';
    return 'unclassified';
  }

  private snakeCase(s: string): string {
    return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
}
