import { UploadBatchRow, UploadPreviewRow, UploadValidationErrorRow } from '@wealthtrack/shared-types';

export interface UploadBatchRepository {
  create(batch: UploadBatchRow): Promise<void>;
  findById(id: string): Promise<UploadBatchRow | null>;
  listByUploader(uploaderId: string, cursor?: string, limit?: number): Promise<UploadBatchRow[]>;
  updateStatus(id: string, status: UploadBatchRow['status']): Promise<void>;
}

export interface UploadBatchRowRepository {
  replaceBatchRows(batchId: string, rows: UploadPreviewRow[]): Promise<void>;
  listByBatchId(batchId: string): Promise<UploadPreviewRow[]>;
}

export interface UploadValidationErrorRepository {
  replaceBatchErrors(batchId: string, errors: UploadValidationErrorRow[]): Promise<void>;
  listByBatchId(batchId: string): Promise<UploadValidationErrorRow[]>;
}
