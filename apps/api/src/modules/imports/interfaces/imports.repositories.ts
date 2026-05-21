import { IdempotencyKeyRow, InvestmentRecordRow } from '@wealthtrack/shared-types';

export interface ImportInvestmentRepository {
  insertConfirmed(records: InvestmentRecordRow[]): Promise<void>;
  archiveByBatch(batchId: string): Promise<void>;
}

export interface IdempotencyKeyRepository {
  create(record: IdempotencyKeyRow): Promise<void>;
  findByScopeAndKey(scope: IdempotencyKeyRow['scope'], idempotencyKey: string): Promise<IdempotencyKeyRow | null>;
  deleteByScopeAndKey(scope: IdempotencyKeyRow['scope'], idempotencyKey: string): Promise<void>;
}
