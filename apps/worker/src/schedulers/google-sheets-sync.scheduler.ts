import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { GOOGLE_SHEETS_SYNC_QUEUE, GoogleSheetsSyncJob, IntegrationSourceRow } from '@wealthtrack/shared-types';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { createId, nowIso } from '../common/utils/ids';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const FREQUENCY_THRESHOLDS_MS: Record<string, number> = {
  daily:   24 * 60 * 60 * 1000,
  weekly:   7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class GoogleSheetsSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoogleSheetsSyncScheduler.name);
  private readonly connection = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6380),
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
  private readonly queue = new Queue<GoogleSheetsSyncJob>(GOOGLE_SHEETS_SYNC_QUEUE, {
    connection: this.connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: 500,
      removeOnFail: 200,
    },
  });
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly mysql: MysqlWorkerService) {}

  onModuleInit(): void {
    // Run once immediately on startup, then every POLL_INTERVAL_MS
    this.run().catch((err: Error) =>
      this.logger.error(`Initial Google Sheets sync check failed: ${err.message}`, err.stack),
    );
    this.intervalHandle = setInterval(() => {
      this.run().catch((err: Error) =>
        this.logger.error(`Scheduled Google Sheets sync check failed: ${err.message}`, err.stack),
      );
    }, POLL_INTERVAL_MS);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    await this.queue.close();
    await this.connection.quit();
  }

  private async run(): Promise<void> {
    const sources = await this.mysql.selectMany<IntegrationSourceRow>(
      `SELECT * FROM integration_sources WHERE source_type = 'google_sheets' AND status = 'active'`,
      [],
    );

    for (const source of sources) {
      if (!this.isDue(source)) continue;

      const syncBatchId = createId();
      const correlationId = createId();

      await this.mysql.execute('INSERT INTO sync_batches SET ?', [
        {
          id: syncBatchId,
          integrationSourceId: source.id,
          triggeredBy: null,
          sourceType: 'api_sync',
          triggerMode: 'scheduled',
          status: 'pending',
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          duplicateRecords: 0,
          skippedRecords: 0,
          requestId: null,
          correlationId,
          startedAt: nowIso(),
          completedAt: null,
          errorMessage: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ]);

      await this.queue.add('google-sheets-sync', {
        integrationSourceId: source.id,
        syncBatchId,
        tabIds: [],
        actorId: 'system',
        requestId: createId(),
        correlationId,
        triggerMode: 'scheduled',
      } satisfies GoogleSheetsSyncJob);

      this.logger.log(`Enqueued scheduled sync for integration "${source.name}" (${source.id})`);
    }
  }

  private isDue(source: IntegrationSourceRow): boolean {
    if (source.syncFrequency === 'manual') return false;
    if (!source.lastSuccessfulSyncAt) return true;
    const threshold = FREQUENCY_THRESHOLDS_MS[source.syncFrequency];
    if (!threshold) return false;
    return Date.now() - new Date(source.lastSuccessfulSyncAt).getTime() >= threshold;
  }
}
