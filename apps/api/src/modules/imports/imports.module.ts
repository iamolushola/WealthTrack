import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { MysqlIdempotencyKeyRepository, MysqlImportInvestmentRepository } from './repositories/mysql-imports.repositories';
import { MysqlUploadBatchRepository, MysqlUploadBatchRowRepository } from '../uploads/repositories/mysql-uploads.repositories';
import { MysqlInvestmentRecordRepository } from '../investments/repositories/mysql-investments.repository';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    MysqlImportInvestmentRepository,
    MysqlIdempotencyKeyRepository,
    MysqlUploadBatchRepository,
    MysqlUploadBatchRowRepository,
    MysqlInvestmentRecordRepository,
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
