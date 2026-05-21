import { InvestmentRecordRow, SourceChannelRow, TenorBandRow } from '@wealthtrack/shared-types';

export interface AnalyticsDateFilter {
  from?: string;        // YYYY-MM-DD
  to?: string;          // YYYY-MM-DD
  q?: string;           // free-text: customer_name, customer_id, relationship_manager
  customerType?: 'new' | 'returning';
}

export interface AnalyticsInvestmentRepository {
  listConfirmedValid(filter?: AnalyticsDateFilter): Promise<InvestmentRecordRow[]>;
}

export interface AnalyticsReferenceRepository {
  listActiveTenorBands(): Promise<TenorBandRow[]>;
  listActiveSourceChannels(): Promise<SourceChannelRow[]>;
}
