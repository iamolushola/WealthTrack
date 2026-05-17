import { InvestmentRecordRow } from '@wealthtrack/shared-types';

export interface InvestmentRecordRepository {
  findById(id: string): Promise<InvestmentRecordRow | null>;
  findByCustomerId(customerId: string, cursor?: string, limit?: number): Promise<InvestmentRecordRow[]>;
  findByReference(reference: string): Promise<InvestmentRecordRow | null>;
  findBySourceHash(sourceHash: string): Promise<InvestmentRecordRow | null>;
}
