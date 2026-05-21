import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import IORedis from 'ioredis';
import { Job, Worker } from 'bullmq';
import { CsvProcessingProcessor } from './processors/csv-processing.processor';
import { ImportProcessor } from './processors/import.processor';
import { ReportProcessor } from './processors/report.processor';
import { SyncProcessor } from './processors/sync.processor';
import { GoogleSheetsSyncProcessor } from './processors/google-sheets-sync.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { OutboxProcessor } from './processors/outbox.processor';
import { QueueProcessor } from './processors/processor.interface';
import { MysqlWorkerService } from './persistence/mysql.service';
import { CSV_PROCESSING_QUEUE } from './queues/csv-processing.queue';
import { nowIso } from './common/utils/ids';

@Injectable()
export class WorkerRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly workers: Worker[] = [];
  private readonly redis = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6380),
    maxRetriesPerRequest: null,
  });

  constructor(
    private readonly csvProcessingProcessor: CsvProcessingProcessor,
    private readonly importProcessor: ImportProcessor,
    private readonly reportProcessor: ReportProcessor,
    private readonly syncProcessor: SyncProcessor,
    private readonly googleSheetsSyncProcessor: GoogleSheetsSyncProcessor,
    private readonly notificationProcessor: NotificationProcessor,
    private readonly outboxProcessor: OutboxProcessor,
    private readonly mysql: MysqlWorkerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const processors: QueueProcessor<unknown>[] = [
      this.csvProcessingProcessor,
      this.importProcessor,
      this.reportProcessor,
      this.syncProcessor,
      this.googleSheetsSyncProcessor,
      this.notificationProcessor,
      this.outboxProcessor,
    ];

    for (const processor of processors) {
      const worker = new Worker(
        processor.queueName,
        async (job: Job) => processor.handle(job.name, job.data),
        { connection: this.redis, concurrency: 1, lockDuration: 300_000 },
      );
      worker.on('completed', (job) => {
        this.logger.log(`Completed job ${job.name} on queue ${processor.queueName}`);
      });
      worker.on('failed', (job, error) => {
        this.logger.error(`Failed job ${job?.name ?? 'unknown'} on queue ${processor.queueName}: ${error.message}`);
        if (processor.queueName === CSV_PROCESSING_QUEUE && job?.data?.batchId) {
          void this.mysql.execute('UPDATE upload_batches SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?', [
            'failed',
            nowIso(),
            nowIso(),
            job.data.batchId,
          ]).catch((updateError: unknown) => {
            const message = updateError instanceof Error ? updateError.message : 'Unknown update error';
            this.logger.error(`Failed to mark upload batch ${job.data.batchId} as failed: ${message}`);
          });
        }
      });
      this.workers.push(worker);
    }

    this.logger.log(`Registered ${this.workers.length} BullMQ workers`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await this.redis.quit();
  }
}
