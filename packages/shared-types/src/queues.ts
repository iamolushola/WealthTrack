export const CSV_PROCESSING_QUEUE = 'csv-processing';
export const IMPORT_QUEUE = 'import';
export const REPORT_QUEUE = 'reports';
export const SYNC_QUEUE = 'sync';
export const NOTIFICATION_QUEUE = 'notification';
export const OUTBOX_QUEUE = 'outbox';

export interface ProcessCsvUploadJob {
  batchId: string;
  requestId: string;
  correlationId: string;
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
