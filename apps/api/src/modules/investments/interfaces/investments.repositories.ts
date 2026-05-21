import { InvestmentRecordRow } from '@wealthtrack/shared-types';

export type InvestmentFilters = {
  q?: string;
  customerType?: 'new' | 'returning';
  fundType?: 'inflow' | 'rollover';
  importStatus?: string;
  tenorCategory?: string;
  from?: string;
  to?: string;
};

export type CommissionFilters = {
  q?: string;
  customerType?: 'new' | 'returning';
  fundType?: 'inflow' | 'rollover';
  from?: string;
  to?: string;
};

export type InvestmentListRow = InvestmentRecordRow & {
  team: string | null;
  days2Maturity: number | null;
};

export type CommissionRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerType: 'new' | 'returning';
  relationshipManager: string | null;
  investmentAmount: string;
  mobilisationDate: string;
  fundType: 'inflow' | 'rollover';
  tenorDays: number;
  investmentReference: string | null;
  currency: string;
  sourceChannel: string | null;
  importStatus: string;
  wmNtbComm: string | null;
  wmRetnComm: string | null;
  tmNtbComm: string | null;
  tmRetnComm: string | null;
  omNtbComm: string | null;
  omRetnComm: string | null;
  ooNtbComm: string | null;
  ooRetnComm: string | null;
  wpFundsComm: string | null;
  wpTeamComm: string | null;
};

export type CommissionSummaryRow = {
  totalItems: number;
  wmNtbTotal: string | null;
  wmRetnTotal: string | null;
  tmNtbTotal: string | null;
  tmRetnTotal: string | null;
  omNtbTotal: string | null;
  omRetnTotal: string | null;
  ooNtbTotal: string | null;
  ooRetnTotal: string | null;
  wpFundsTotal: string | null;
  wpTeamTotal: string | null;
};

export interface InvestmentRecordRepository {
  findAll(cursor?: string, limit?: number): Promise<InvestmentRecordRow[]>;
  findAllPaged(offset: number, limit: number, filters?: InvestmentFilters): Promise<InvestmentListRow[]>;
  count(filters?: InvestmentFilters): Promise<number>;
  findAllWithCommissions(offset: number, limit: number, filters?: CommissionFilters): Promise<CommissionRow[]>;
  commissionSummary(filters?: CommissionFilters): Promise<CommissionSummaryRow>;
  findById(id: string): Promise<InvestmentRecordRow | null>;
  findByCustomerId(customerId: string, cursor?: string, limit?: number): Promise<InvestmentRecordRow[]>;
  findByReference(reference: string): Promise<InvestmentRecordRow | null>;
  findBySourceHash(sourceHash: string): Promise<InvestmentRecordRow | null>;
  deleteByIds(ids: string[]): Promise<number>;
  deleteByCustomerIds(customerIds: string[]): Promise<number>;
}
