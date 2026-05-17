import { Module } from '@nestjs/common';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { MysqlUploadBatchRepository } from '../uploads/repositories/mysql-uploads.repositories';
import { MysqlSyncValidationErrorRepository, MysqlValidationPreviewRepository } from './repositories/mysql-validation.repositories';
import { ValidationPolicy } from './policies/validation.policy';

@Module({
  controllers: [ValidationController],
  providers: [
    ValidationService,
    ValidationPolicy,
    MysqlUploadBatchRepository,
    MysqlValidationPreviewRepository,
    MysqlSyncValidationErrorRepository,
  ],
  exports: [ValidationService],
})
export class ValidationModule {}
