import { SyncBatchErrorRow, UploadPreviewRow, UploadValidationErrorRow } from '@wealthtrack/shared-types';

export interface ValidationPreviewRepository {
  listBatchRows(batchId: string): Promise<UploadPreviewRow[]>;
  listBatchErrors(batchId: string): Promise<UploadValidationErrorRow[]>;
}

export interface SyncValidationErrorRepository {
  replaceSyncErrors(syncBatchId: string, errors: SyncBatchErrorRow[]): Promise<void>;
  listSyncErrors(syncBatchId: string): Promise<SyncBatchErrorRow[]>;
}