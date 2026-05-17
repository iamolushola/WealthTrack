import { Injectable } from '@nestjs/common';
import { SyncBatchErrorRow, UploadPreviewRow, UploadValidationErrorRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { SyncValidationErrorRepository, ValidationPreviewRepository } from '../interfaces/validation.repositories';

@Injectable()
export class MysqlValidationPreviewRepository implements ValidationPreviewRepository {
  constructor(private readonly mysql: MysqlService) {}

  listBatchRows(batchId: string): Promise<UploadPreviewRow[]> {
    return this.mysql.selectMany<UploadPreviewRow>('SELECT * FROM upload_batch_rows WHERE upload_batch_id = ?', [batchId]);
  }

  listBatchErrors(batchId: string): Promise<UploadValidationErrorRow[]> {
    return this.mysql.selectMany<UploadValidationErrorRow>('SELECT * FROM upload_validation_errors WHERE upload_batch_id = ?', [batchId]);
  }
}

@Injectable()
export class MysqlSyncValidationErrorRepository implements SyncValidationErrorRepository {
  constructor(private readonly mysql: MysqlService) {}

  async replaceSyncErrors(syncBatchId: string, errors: SyncBatchErrorRow[]): Promise<void> {
    await this.mysql.execute('DELETE FROM sync_batch_errors WHERE sync_batch_id = ?', [syncBatchId]);
    await Promise.all(errors.map((error) => this.mysql.execute('INSERT INTO sync_batch_errors SET ?', [error])));
  }

  listSyncErrors(syncBatchId: string): Promise<SyncBatchErrorRow[]> {
    return this.mysql.selectMany<SyncBatchErrorRow>('SELECT * FROM sync_batch_errors WHERE sync_batch_id = ?', [syncBatchId]);
  }
}
