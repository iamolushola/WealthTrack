import { Injectable } from '@nestjs/common';
import { InvestmentRecordRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { InvestmentRecordRepository } from '../interfaces/investments.repositories';

@Injectable()
export class MysqlInvestmentRecordRepository implements InvestmentRecordRepository {
  constructor(private readonly mysql: MysqlService) {}

  findAll(cursor?: string, limit = 50): Promise<InvestmentRecordRow[]> {
    if (cursor) {
      return this.mysql.selectMany<InvestmentRecordRow>(
        'SELECT * FROM investment_records WHERE id > ? ORDER BY mobilisation_date DESC, id ASC LIMIT ?',
        [cursor, limit],
      );
    }

    return this.mysql.selectMany<InvestmentRecordRow>(
      'SELECT * FROM investment_records ORDER BY mobilisation_date DESC, id ASC LIMIT ?',
      [limit],
    );
  }

  findAllPaged(offset: number, limit: number): Promise<InvestmentRecordRow[]> {
    return this.mysql.selectMany<InvestmentRecordRow>(
      'SELECT * FROM investment_records ORDER BY mobilisation_date DESC, id ASC LIMIT ? OFFSET ?',
      [limit, offset],
    );
  }

  async count(): Promise<number> {
    const row = await this.mysql.selectOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM investment_records',
      [],
    );
    return row?.total ?? 0;
  }

  findById(id: string): Promise<InvestmentRecordRow | null> {
    return this.mysql.selectOne<InvestmentRecordRow>('SELECT * FROM investment_records WHERE id = ? LIMIT 1', [id]);
  }

  findByCustomerId(customerId: string, cursor?: string, limit = 50): Promise<InvestmentRecordRow[]> {
    if (cursor) {
      return this.mysql.selectMany<InvestmentRecordRow>(
        'SELECT * FROM investment_records WHERE customer_id = ? AND id > ? ORDER BY id ASC LIMIT ?',
        [customerId, cursor, limit],
      );
    }

    return this.mysql.selectMany<InvestmentRecordRow>(
      'SELECT * FROM investment_records WHERE customer_id = ? ORDER BY mobilisation_date DESC LIMIT ?',
      [customerId, limit],
    );
  }

  findByReference(reference: string): Promise<InvestmentRecordRow | null> {
    return this.mysql.selectOne<InvestmentRecordRow>('SELECT * FROM investment_records WHERE investment_reference = ? LIMIT 1', [reference]);
  }

  findBySourceHash(sourceHash: string): Promise<InvestmentRecordRow | null> {
    return this.mysql.selectOne<InvestmentRecordRow>('SELECT * FROM investment_records WHERE source_record_hash = ? LIMIT 1', [sourceHash]);
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(', ');
    const result = await this.mysql.execute(
      `DELETE FROM investment_records WHERE id IN (${placeholders})`,
      ids,
    );
    return result.affectedRows as number;
  }

  async deleteByCustomerIds(customerIds: string[]): Promise<number> {
    if (customerIds.length === 0) return 0;
    const placeholders = customerIds.map(() => '?').join(', ');
    const result = await this.mysql.execute(
      `DELETE FROM investment_records WHERE customer_id IN (${placeholders})`,
      customerIds,
    );
    return result.affectedRows as number;
  }
}
