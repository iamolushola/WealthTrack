import { SyncBatchErrorRow, SyncBatchRow } from '@wealthtrack/shared-types';

export interface SyncBatchRepository {
  create(batch: SyncBatchRow): Promise<void>;
  findById(id: string): Promise<SyncBatchRow | null>;
  listByIntegrationSourceId(integrationSourceId: string, cursor?: string, limit?: number): Promise<SyncBatchRow[]>;
  updateStatus(id: string, status: SyncBatchRow['status']): Promise<void>;
}

export interface SyncBatchErrorRepository {
  appendMany(errors: SyncBatchErrorRow[]): Promise<void>;
  listBySyncBatchId(syncBatchId: string): Promise<SyncBatchErrorRow[]>;
}
