import { Injectable } from '@nestjs/common';
import { InvestmentRecordRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { InvestmentRecordRepository } from '../interfaces/investments.repositories';

@Injectable()
export class MysqlInvestmentRecordRepository implements InvestmentRecordRepository {
  constructor(private readonly mysql: MysqlService) {}

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
}
