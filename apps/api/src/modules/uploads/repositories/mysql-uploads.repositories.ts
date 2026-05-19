import { Injectable } from '@nestjs/common';
import { UploadBatchRow, UploadPreviewRow, UploadValidationErrorRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import {
  UploadBatchRepository,
  UploadBatchRowRepository,
  UploadValidationErrorRepository,
} from '../interfaces/uploads.repositories';

@Injectable()
export class MysqlUploadBatchRepository implements UploadBatchRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(batch: UploadBatchRow): Promise<void> {
    await this.mysql.execute('INSERT INTO upload_batches SET ?', [batch]);
  }

  findById(id: string): Promise<UploadBatchRow | null> {
    return this.mysql.selectOne<UploadBatchRow>('SELECT * FROM upload_batches WHERE id = ? LIMIT 1', [id]);
  }

  listByUploader(uploaderId: string, cursor?: string, limit = 50): Promise<UploadBatchRow[]> {
    if (cursor) {
      return this.mysql.selectMany<UploadBatchRow>(
        'SELECT * FROM upload_batches WHERE uploaded_by = ? AND id > ? ORDER BY id ASC LIMIT ?',
        [uploaderId, cursor, limit],
      );
    }

    return this.mysql.selectMany<UploadBatchRow>(
      'SELECT * FROM upload_batches WHERE uploaded_by = ? ORDER BY created_at DESC LIMIT ?',
      [uploaderId, limit],
    );
  }

  listAll(cursor?: string, limit = 100): Promise<UploadBatchRow[]> {
    if (cursor) {
      return this.mysql.selectMany<UploadBatchRow>(
        'SELECT * FROM upload_batches WHERE id > ? ORDER BY created_at DESC LIMIT ?',
        [cursor, limit],
      );
    }

    return this.mysql.selectMany<UploadBatchRow>('SELECT * FROM upload_batches ORDER BY created_at DESC LIMIT ?', [limit]);
  }

  async updateStatus(id: string, status: UploadBatchRow['status']): Promise<void> {
    await this.mysql.execute('UPDATE upload_batches SET status = ? WHERE id = ?', [status, id]);
  }

  async deleteAll(): Promise<number> {
    const result = await this.mysql.execute('DELETE FROM upload_batches');
    return result.affectedRows;
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(', ');
    // Delete in FK-safe order: errors → investment records → batch rows → batches
    await this.mysql.execute(`DELETE FROM upload_validation_errors WHERE upload_batch_id IN (${placeholders})`, ids);
    await this.mysql.execute(`DELETE FROM investment_records WHERE import_batch_id IN (${placeholders})`, ids);
    await this.mysql.execute(`DELETE FROM upload_batch_rows WHERE upload_batch_id IN (${placeholders})`, ids);
    const result = await this.mysql.execute(`DELETE FROM upload_batches WHERE id IN (${placeholders})`, ids);
    return result.affectedRows as number;
  }
}

@Injectable()
export class MysqlUploadBatchRowRepository implements UploadBatchRowRepository {
  constructor(private readonly mysql: MysqlService) {}

  async replaceBatchRows(batchId: string, rows: UploadPreviewRow[]): Promise<void> {
    await this.mysql.execute('DELETE FROM upload_batch_rows WHERE upload_batch_id = ?', [batchId]);
    await Promise.all(rows.map((row) => this.mysql.execute('INSERT INTO upload_batch_rows SET ?', [row])));
  }

  listByBatchId(batchId: string): Promise<UploadPreviewRow[]> {
    return this.mysql.selectMany<UploadPreviewRow>(
      'SELECT * FROM upload_batch_rows WHERE upload_batch_id = ? ORDER BY csv_row_number ASC',
      [batchId],
    );
  }
}

@Injectable()
export class MysqlUploadValidationErrorRepository implements UploadValidationErrorRepository {
  constructor(private readonly mysql: MysqlService) {}

  async replaceBatchErrors(batchId: string, errors: UploadValidationErrorRow[]): Promise<void> {
    await this.mysql.execute('DELETE FROM upload_validation_errors WHERE upload_batch_id = ?', [batchId]);
    await Promise.all(errors.map((error) => this.mysql.execute('INSERT INTO upload_validation_errors SET ?', [error])));
  }

  listByBatchId(batchId: string): Promise<UploadValidationErrorRow[]> {
    return this.mysql.selectMany<UploadValidationErrorRow>(
      'SELECT * FROM upload_validation_errors WHERE upload_batch_id = ? ORDER BY csv_row_number ASC',
      [batchId],
    );
  }
}
