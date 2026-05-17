import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import {
  ConfirmImportJob,
  CSV_PROCESSING_QUEUE,
  DispatchOutboxEventJob,
  GenerateReportJob,
  IMPORT_QUEUE,
  ManualSyncJob,
  OUTBOX_QUEUE,
  ProcessCsvUploadJob,
  REPORT_QUEUE,
  SYNC_QUEUE,
} from '@wealthtrack/shared-types';

@Injectable()
export class JobDispatcherService implements OnModuleDestroy {
  private readonly connection = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6380),
    maxRetriesPerRequest: null,
  });

  private readonly csvQueue = new Queue<ProcessCsvUploadJob>(CSV_PROCESSING_QUEUE, { connection: this.connection });
  private readonly importQueue = new Queue<ConfirmImportJob>(IMPORT_QUEUE, { connection: this.connection });
  private readonly reportQueue = new Queue<GenerateReportJob>(REPORT_QUEUE, { connection: this.connection });
  private readonly syncQueue = new Queue<ManualSyncJob>(SYNC_QUEUE, { connection: this.connection });
  private readonly outboxQueue = new Queue<DispatchOutboxEventJob>(OUTBOX_QUEUE, { connection: this.connection });

  enqueueCsvProcessing(job: ProcessCsvUploadJob): Promise<void> {
    return this.csvQueue.add('process-csv-upload', job).then(() => undefined);
  }

  enqueueImport(job: ConfirmImportJob): Promise<void> {
    return this.importQueue.add('confirm-import', job).then(() => undefined);
  }

  enqueueReport(job: GenerateReportJob): Promise<void> {
    return this.reportQueue.add('generate-report', job).then(() => undefined);
  }

  enqueueSync(job: ManualSyncJob): Promise<void> {
    return this.syncQueue.add('manual-sync', job).then(() => undefined);
  }

  enqueueOutbox(job: DispatchOutboxEventJob): Promise<void> {
    return this.outboxQueue.add('dispatch-outbox-event', job).then(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.csvQueue.close(),
      this.importQueue.close(),
      this.reportQueue.close(),
      this.syncQueue.close(),
      this.outboxQueue.close(),
    ]);
    await this.connection.quit();
  }
}
