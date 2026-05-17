import { Injectable, Logger } from '@nestjs/common';
import { IntegrationSourceRow, ManualSyncJob, SYNC_QUEUE } from '@wealthtrack/shared-types';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { createId, nowIso } from '../common/utils/ids';
import { QueueProcessor } from './processor.interface';

@Injectable()
export class SyncProcessor implements QueueProcessor<ManualSyncJob> {
  readonly queueName = SYNC_QUEUE;
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly mysql: MysqlWorkerService) {}

  async handle(jobName: string, data: ManualSyncJob): Promise<{ status: string; syncBatchId: string }> {
    const source = await this.mysql.selectOne<IntegrationSourceRow>('SELECT * FROM integration_sources WHERE id = ? LIMIT 1', [
      data.integrationSourceId,
    ]);
    if (!source) {
      throw new Error(`Integration source ${data.integrationSourceId} not found`);
    }

    await this.mysql.execute('UPDATE sync_batches SET status = ?, updated_at = ? WHERE id = ?', ['running', nowIso(), data.syncBatchId]);
    const records = Array.isArray((source.connectionConfig as { records?: unknown[] } | null)?.records)
      ? ((source.connectionConfig as { records?: Record<string, unknown>[] }).records ?? [])
      : [];

    let validRecords = 0;
    let invalidRecords = 0;
    for (const record of records) {
      if (!record.customerId || !record.customerName || !record.investmentAmount) {
        invalidRecords += 1;
        await this.mysql.execute('INSERT INTO sync_batch_errors SET ?', [
          {
            id: createId(),
            syncBatchId: data.syncBatchId,
            sourceRecordIdentifier: String(record.customerId ?? createId()),
            errorCode: 'invalid_record',
            errorMessage: 'Missing required sync record fields',
            rawPayloadJson: record,
            createdAt: nowIso(),
          },
        ]);
        continue;
      }

      await this.mysql.execute('INSERT INTO investment_records SET ?', [
        {
          id: createId(),
          customerId: String(record.customerId),
          customerName: String(record.customerName),
          customerType: (record.customerType as string) === 'new' ? 'new' : 'returning',
          mobilisationDate: String(record.mobilisationDate ?? nowIso().slice(0, 10)),
          investmentAmount: String(record.investmentAmount),
          fundType: (record.fundType as string) === 'rollover' ? 'rollover' : 'inflow',
          tenorDays: Number(record.tenorDays ?? 30),
          tenorCategory: (record.tenorCategory as string) ?? 'unclassified',
          maturityDate: record.maturityDate ? String(record.maturityDate) : null,
          investmentReference: record.investmentReference ? String(record.investmentReference) : null,
          currency: String(record.currency ?? 'NGN'),
          sourceChannel: record.sourceChannel ? String(record.sourceChannel) : null,
          relationshipManager: record.relationshipManager ? String(record.relationshipManager) : null,
          costOfFunds: record.costOfFunds ? String(record.costOfFunds) : null,
          importBatchId: null,
          uploadBatchRowId: null,
          syncBatchId: data.syncBatchId,
          dataSource: source.sourceType === 'api' ? 'api_sync' : 'db_sync',
          importStatus: 'confirmed',
          recordStatus: 'valid',
          sourceRecordHash: record.investmentReference ? String(record.investmentReference) : `${data.syncBatchId}:${validRecords}`,
          confirmedBy: data.actorId,
          confirmedAt: nowIso(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          createdBy: data.actorId,
          updatedBy: data.actorId,
        },
      ]);
      validRecords += 1;
    }

    await this.mysql.execute(
      'UPDATE sync_batches SET status = ?, total_records = ?, valid_records = ?, invalid_records = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [invalidRecords > 0 ? 'partial_success' : 'success', records.length, validRecords, invalidRecords, nowIso(), nowIso(), data.syncBatchId],
    );

    this.logger.log(`Processed ${jobName} for sync batch ${data.syncBatchId}`);
    return { status: invalidRecords > 0 ? 'partial_success' : 'success', syncBatchId: data.syncBatchId };
  }
}
