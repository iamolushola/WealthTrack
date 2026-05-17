import { Injectable } from '@nestjs/common';
import { InvestmentRecordRow, SourceChannelRow, TenorBandRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { AnalyticsInvestmentRepository, AnalyticsReferenceRepository } from '../interfaces/analytics.repositories';

@Injectable()
export class MysqlAnalyticsInvestmentRepository implements AnalyticsInvestmentRepository {
  constructor(private readonly mysql: MysqlService) {}

  listConfirmedValid(): Promise<InvestmentRecordRow[]> {
    return this.mysql.selectMany<InvestmentRecordRow>(
      'SELECT * FROM investment_records WHERE record_status = ? AND import_status = ?',
      ['valid', 'confirmed'],
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
