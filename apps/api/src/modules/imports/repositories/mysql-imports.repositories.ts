import { Injectable } from '@nestjs/common';
import { IdempotencyKeyRow, InvestmentRecordRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { IdempotencyKeyRepository, ImportInvestmentRepository } from '../interfaces/imports.repositories';

@Injectable()
export class MysqlImportInvestmentRepository implements ImportInvestmentRepository {
  constructor(private readonly mysql: MysqlService) {}

  async insertConfirmed(records: InvestmentRecordRow[]): Promise<void> {
    await Promise.all(records.map((record) => this.mysql.execute('INSERT INTO investment_records SET ?', [record])));
  }

  async archiveByBatch(batchId: string): Promise<void> {
    await this.mysql.execute('UPDATE investment_records SET import_status = ? WHERE import_batch_id = ?', ['archived', batchId]);
  }
}

@Injectable()
export class MysqlIdempotencyKeyRepository implements IdempotencyKeyRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(record: IdempotencyKeyRow): Promise<void> {
    await this.mysql.execute('INSERT INTO idempotency_keys SET ?', [record]);
  }

  findByScopeAndKey(scope: IdempotencyKeyRow['scope'], idempotencyKey: string): Promise<IdempotencyKeyRow | null> {
    return this.mysql.selectOne<IdempotencyKeyRow>(
      'SELECT * FROM idempotency_keys WHERE scope = ? AND idempotency_key = ? LIMIT 1',
      [scope, idempotencyKey],
    );
  }

  async deleteByScopeAndKey(scope: IdempotencyKeyRow['scope'], idempotencyKey: string): Promise<void> {
    await this.mysql.execute(
      'DELETE FROM idempotency_keys WHERE scope = ? AND idempotency_key = ?',
      [scope, idempotencyKey],
    );
  }
}
