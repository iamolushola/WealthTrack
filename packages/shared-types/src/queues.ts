export const CSV_PROCESSING_QUEUE = 'csv-processing';
export const GOOGLE_SHEETS_SYNC_QUEUE = 'google-sheets-sync';
export const IMPORT_QUEUE = 'import';
export const REPORT_QUEUE = 'reports';
export const SYNC_QUEUE = 'sync';
export const NOTIFICATION_QUEUE = 'notification';
export const OUTBOX_QUEUE = 'outbox';

export interface ProcessCsvUploadJob {
  batchId: string;
  requestId: string;
  correlationId: string;
  /** Base64-encoded CSV content. Present when cloud upload failed and the API
   *  fell back to local storage — lets the worker read the file without needing
   *  access to the API pod's filesystem (required in multi-pod deployments). */
  fileContent?: string;
}

export interface ConfirmImportJob {
  batchId: string;
  actorId: string;
  requestId: string;
  correlationId: string;
}

export interface GenerateReportJob {
  reportExportId: string;
  requestId: string;
  correlationId: string;
}

export interface ManualSyncJob {
  syncBatchId: string;
  integrationSourceId: string;
  actorId: string;
  requestId: string;
  correlationId: string;
}


export interface NotificationJob {
  eventId: string;
  requestId?: string;
  correlationId: string;
}

export interface DispatchOutboxEventJob {
  outboxEventId: string;
  correlationId: string;
}

export interface GoogleSheetsSyncJob {
  integrationSourceId: string;
  syncBatchId: string;
  tabIds: string[];
  actorId: string;
  requestId: string;
  correlationId: string;
  triggerMode: 'scheduled' | 'manual' | 'webhook';
}
