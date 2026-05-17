import { Module } from '@nestjs/common';
import { FileStorageService } from './common/file-storage.service';
import { MysqlWorkerService } from './persistence/mysql.service';
import { CsvProcessingProcessor } from './processors/csv-processing.processor';
import { ImportProcessor } from './processors/import.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { OutboxProcessor } from './processors/outbox.processor';
import { ReportProcessor } from './processors/report.processor';
import { SyncProcessor } from './processors/sync.processor';
import { WorkerRuntimeService } from './worker-runtime.service';

@Module({
	providers: [
		MysqlWorkerService,
		FileStorageService,
		CsvProcessingProcessor,
		ImportProcessor,
		ReportProcessor,
		SyncProcessor,
		NotificationProcessor,
		OutboxProcessor,
		WorkerRuntimeService,
	],
})
export class WorkerModule {}
