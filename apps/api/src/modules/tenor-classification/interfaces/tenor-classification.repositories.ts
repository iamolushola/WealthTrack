import { TenorBandRow } from '@wealthtrack/shared-types';

export interface TenorBandRepository {
  listActive(): Promise<TenorBandRow[]>;
}
