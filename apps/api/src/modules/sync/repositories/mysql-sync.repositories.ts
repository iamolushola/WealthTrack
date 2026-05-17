import { Injectable } from '@nestjs/common';
import { SyncBatchErrorRow, SyncBatchRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { SyncBatchErrorRepository, SyncBatchRepository } from '../interfaces/sync.repositories';

@Injectable()
export class MysqlSyncBatchRepository implements SyncBatchRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(batch: SyncBatchRow): Promise<void> {
    await this.mysql.execute('INSERT INTO sync_batches SET ?', [batch]);
  }

  findById(id: string): Promise<SyncBatchRow | null> {
    return this.mysql.selectOne<SyncBatchRow>('SELECT * FROM sync_batches WHERE id = ? LIMIT 1', [id]);
  }

  listByIntegrationSourceId(integrationSourceId: string, cursor?: string, limit = 50): Promise<SyncBatchRow[]> {
    if (cursor) {
      return this.mysql.selectMany<SyncBatchRow>(
        'SELECT * FROM sync_batches WHERE integration_source_id = ? AND id > ? ORDER BY id ASC LIMIT ?',
        [integrationSourceId, cursor, limit],
      );
    }

    return this.mysql.selectMany<SyncBatchRow>(
      'SELECT * FROM sync_batches WHERE integration_source_id = ? ORDER BY started_at DESC LIMIT ?',
      [integrationSourceId, limit],
    );
  }

  async updateStatus(id: string, status: SyncBatchRow['status']): Promise<void> {
    await this.mysql.execute('UPDATE sync_batches SET status = ? WHERE id = ?', [status, id]);
  }
}

@Injectable()
export class MysqlSyncBatchErrorRepository implements SyncBatchErrorRepository {
  constructor(private readonly mysql: MysqlService) {}

  async appendMany(errors: SyncBatchErrorRow[]): Promise<void> {
    await Promise.all(errors.map((error) => this.mysql.execute('INSERT INTO sync_batch_errors SET ?', [error])));
  }

  listBySyncBatchId(syncBatchId: string): Promise<SyncBatchErrorRow[]> {
    return this.mysql.selectMany<SyncBatchErrorRow>('SELECT * FROM sync_batch_errors WHERE sync_batch_id = ?', [syncBatchId]);
  }
}
