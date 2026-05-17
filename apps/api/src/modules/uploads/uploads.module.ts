import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { ImportsModule } from '../imports/imports.module';
import { OutboxModule } from '../outbox/outbox.module';
import { UploadsPolicy } from './policies/uploads.policy';
import {
  MysqlUploadBatchRepository,
  MysqlUploadBatchRowRepository,
  MysqlUploadValidationErrorRepository,
} from './repositories/mysql-uploads.repositories';

@Module({
  imports: [ImportsModule, OutboxModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    UploadsPolicy,
    MysqlUploadBatchRepository,
    MysqlUploadBatchRowRepository,
    MysqlUploadValidationErrorRepository,
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
