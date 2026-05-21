import { Injectable } from '@nestjs/common';
import { InvestmentRecordRow, SourceChannelRow, TenorBandRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { AnalyticsDateFilter, AnalyticsInvestmentRepository, AnalyticsReferenceRepository } from '../interfaces/analytics.repositories';

@Injectable()
export class MysqlAnalyticsInvestmentRepository implements AnalyticsInvestmentRepository {
  constructor(private readonly mysql: MysqlService) {}

  listConfirmedValid(filter?: AnalyticsDateFilter): Promise<InvestmentRecordRow[]> {
    const conditions: string[] = ['record_status = ?', 'import_status = ?'];
    const params: unknown[] = ['valid', 'confirmed'];

    if (filter?.from) {
      conditions.push('mobilisation_date >= ?');
      params.push(filter.from);
    }
    if (filter?.to) {
      conditions.push('mobilisation_date <= ?');
      params.push(filter.to);
    }
    if (filter?.customerType) {
      conditions.push('customer_type = ?');
      params.push(filter.customerType);
    }
    if (filter?.q) {
      const like = `%${filter.q}%`;
      conditions.push('(customer_name LIKE ? OR customer_id LIKE ? OR relationship_manager LIKE ?)');
      params.push(like, like, like);
    }

    return this.mysql.selectMany<InvestmentRecordRow>(
      `SELECT * FROM investment_records WHERE ${conditions.join(' AND ')}`,
      params,
    );
  }
}

@Injectable()
export class MysqlAnalyticsReferenceRepository implements AnalyticsReferenceRepository {
  constructor(private readonly mysql: MysqlService) {}

  listActiveTenorBands(): Promise<TenorBandRow[]> {
    return this.mysql.selectMany<TenorBandRow>('SELECT * FROM tenor_bands WHERE status = ? ORDER BY display_order ASC', ['active']);
  }

  listActiveSourceChannels(): Promise<SourceChannelRow[]> {
    return this.mysql.selectMany<SourceChannelRow>('SELECT * FROM source_channels WHERE status = ? ORDER BY code ASC', ['active']);
  }
}
