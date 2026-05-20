import { InvestmentRecordRow } from '@wealthtrack/shared-types';

export interface InvestmentRecordRepository {
  findAll(cursor?: string, limit?: number): Promise<InvestmentRecordRow[]>;
  findAllPaged(offset: number, limit: number): Promise<InvestmentRecordRow[]>;
  count(): Promise<number>;
  findById(id: string): Promise<InvestmentRecordRow | null>;
  findByCustomerId(customerId: string, cursor?: string, limit?: number): Promise<InvestmentRecordRow[]>;
  findByReference(reference: string): Promise<InvestmentRecordRow | null>;
  findBySourceHash(sourceHash: string): Promise<InvestmentRecordRow | null>;
  deleteByIds(ids: string[]): Promise<number>;
  deleteByCustomerIds(customerIds: string[]): Promise<number>;
}
