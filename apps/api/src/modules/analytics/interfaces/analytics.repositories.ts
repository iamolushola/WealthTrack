import { InvestmentRecordRow, SourceChannelRow, TenorBandRow } from '@wealthtrack/shared-types';

export interface AnalyticsDateFilter {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export interface AnalyticsInvestmentRepository {
  listConfirmedValid(filter?: AnalyticsDateFilter): Promise<InvestmentRecordRow[]>;
}

export interface AnalyticsReferenceRepository {
  listActiveTenorBands(): Promise<TenorBandRow[]>;
  listActiveSourceChannels(): Promise<SourceChannelRow[]>;
}
