import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { MysqlUploadBatchRepository } from '../uploads/repositories/mysql-uploads.repositories';
import {
  MysqlSyncValidationErrorRepository,
  MysqlValidationPreviewRepository,
} from './repositories/mysql-validation.repositories';
import { ValidationPolicy } from './policies/validation.policy';

@Injectable()
export class ValidationService {
  constructor(
    private readonly validationPolicy: ValidationPolicy,
    private readonly uploadBatchRepository: MysqlUploadBatchRepository,
    private readonly validationPreviewRepository: MysqlValidationPreviewRepository,
    private readonly syncValidationErrorRepository: MysqlSyncValidationErrorRepository,
  ) {}

  async batchSummary(batchId: string, actor: AuthenticatedActor): Promise<object> {
    const batch = await this.uploadBatchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Upload batch not found');
    }

    this.validationPolicy.assertCanReadBatch(actor, batch);

    const rows = await this.validationPreviewRepository.listBatchRows(batchId);
    const errors = await this.validationPreviewRepository.listBatchErrors(batchId);

    return {
      batch,
      counts: {
        rows: rows.length,
        errors: errors.length,
        valid: rows.filter((row) => row.rowStatus === 'valid').length,
        invalid: rows.filter((row) => row.rowStatus === 'invalid').length,
        duplicate: rows.filter((row) => row.rowStatus === 'duplicate').length,
        skipped: rows.filter((row) => row.rowStatus === 'skipped').length,
      },
      rows,
      errors,
      syncErrors: await this.syncValidationErrorRepository.listSyncErrors(batchId),
    };
  }
}
