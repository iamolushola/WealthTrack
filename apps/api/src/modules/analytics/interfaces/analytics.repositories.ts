import { InvestmentRecordRow, SourceChannelRow, TenorBandRow } from '@wealthtrack/shared-types';

export interface AnalyticsInvestmentRepository {
  listConfirmedValid(filters?: Record<string, unknown>): Promise<InvestmentRecordRow[]>;
}

export interface AnalyticsReferenceRepository {
  listActiveTenorBands(): Promise<TenorBandRow[]>;
  listActiveSourceChannels(): Promise<SourceChannelRow[]>;
}
