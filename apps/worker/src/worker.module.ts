import { Module } from '@nestjs/common';
import { FileStorageService } from './common/file-storage.service';
import { GoogleSheetsClientService } from './common/google-sheets-client.service';
import { MysqlWorkerService } from './persistence/mysql.service';
import { CsvProcessingProcessor } from './processors/csv-processing.processor';
import { ImportProcessor } from './processors/import.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { OutboxProcessor } from './processors/outbox.processor';
import { ReportProcessor } from './processors/report.processor';
import { SyncProcessor } from './processors/sync.processor';
import { GoogleSheetsSyncProcessor } from './processors/google-sheets-sync.processor';
import { GoogleSheetsSyncScheduler } from './schedulers/google-sheets-sync.scheduler';
import { WorkerRuntimeService } from './worker-runtime.service';

@Module({
	providers: [
		MysqlWorkerService,
		FileStorageService,
		GoogleSheetsClientService,
		CsvProcessingProcessor,
		ImportProcessor,
		ReportProcessor,
		SyncProcessor,
		GoogleSheetsSyncProcessor,
		NotificationProcessor,
		OutboxProcessor,
		GoogleSheetsSyncScheduler,
		WorkerRuntimeService,
	],
})
export class WorkerModule {}
