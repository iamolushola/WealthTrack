export type ActorType = 'admin' | 'analyst' | 'uploader' | 'system';
export interface RoleRow {
    id: string;
    code: string;
    name: string;
    description: string | null;
    createdAt: string;
}
export interface PermissionRow {
    id: string;
    code: string;
    description: string | null;
    createdAt: string;
}
export interface RolePermissionRow {
    id: string;
    roleId: string;
    permissionId: string;
    createdAt: string;
}
export interface UserRow {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    roleId: string;
    status: 'active' | 'inactive' | 'suspended';
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    createdBy: string | null;
    updatedBy: string | null;
}
export interface AuthSessionRow {
    id: string;
    userId: string;
    refreshTokenHash: string;
    status: 'active' | 'revoked' | 'expired';
    ipAddress: string | null;
    userAgent: string | null;
    lastSeenAt: string | null;
    expiresAt: string;
    createdAt: string;
    revokedAt: string | null;
}
export interface PasswordResetTokenRow {
    id: string;
    userId: string;
    tokenHash: string;
    status: 'issued' | 'used' | 'expired' | 'revoked';
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
}
export interface LoginAttemptRow {
    id: string;
    email: string;
    userId: string | null;
    outcome: 'success' | 'failed' | 'blocked';
    failureReason: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    correlationId: string | null;
    attemptedAt: string;
}
export interface UploadBatchRow {
    id: string;
    fileName: string;
    fileUrl: string;
    fileChecksum: string;
    uploadedBy: string;
    status: 'pending' | 'processing' | 'validated' | 'failed' | 'imported' | 'partially_imported' | 'cancelled';
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    skippedRows: number;
    previewExpiresAt: string | null;
    errorFileUrl: string | null;
    processingStartedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
}
export interface UploadPreviewRow {
    id: string;
    uploadBatchId: string;
    rowNumber: number;
    customerId: string | null;
    customerName: string | null;
    customerType: 'new' | 'returning' | null;
    mobilisationDate: string | null;
    investmentAmount: string | null;
    fundType: 'inflow' | 'rollover' | null;
    tenorDays: number | null;
    tenorCategory: 'short_term' | 'mid_short_term' | 'medium_term' | 'long_term' | 'unclassified' | null;
    maturityDate: string | null;
    investmentReference: string | null;
    currency: string;
    sourceChannel: string | null;
    relationshipManager: string | null;
    costOfFunds: string | null;
    sourceRecordHash: string | null;
    rowStatus: 'valid' | 'invalid' | 'duplicate' | 'skipped';
    rawPayloadJson: Record<string, unknown> | null;
    normalizedPayloadJson: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
}
export interface UploadValidationErrorRow {
    id: string;
    uploadBatchId: string;
    uploadBatchRowId: string | null;
    rowNumber: number;
    fieldName: string;
    errorCode: string;
    errorMessage: string;
    originalValue: string | null;
    createdAt: string;
}
export interface InvestmentRecordRow {
    id: string;
    customerId: string;
    customerName: string;
    customerType: 'new' | 'returning';
    mobilisationDate: string;
    investmentAmount: string;
    fundType: 'inflow' | 'rollover';
    tenorDays: number;
    tenorCategory: 'short_term' | 'mid_short_term' | 'medium_term' | 'long_term' | 'unclassified';
    maturityDate: string | null;
    investmentReference: string | null;
    currency: string;
    sourceChannel: string | null;
    relationshipManager: string | null;
    costOfFunds: string | null;
    importBatchId: string | null;
    uploadBatchRowId: string | null;
    syncBatchId: string | null;
    dataSource: 'csv_upload' | 'api_sync' | 'db_sync';
    importStatus: 'pending' | 'confirmed' | 'rejected' | 'archived';
    recordStatus: 'valid' | 'invalid' | 'duplicate' | 'archived';
    sourceRecordHash: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
}
export interface IdempotencyKeyRow {
    id: string;
    idempotencyKey: string;
    scope: 'upload_confirm' | 'sync_trigger' | 'report_export';
    actorId: string;
    resourceType: string;
    resourceId: string;
    requestHash: string;
    responseStatus: number;
    responseBodyJson: Record<string, unknown> | null;
    lockedUntil: string | null;
    createdAt: string;
    expiresAt: string;
}
export interface IntegrationSourceRow {
    id: string;
    name: string;
    sourceType: 'api' | 'database';
    status: 'active' | 'inactive' | 'failed';
    secretRef: string;
    connectionConfig: Record<string, unknown> | null;
    fieldMapping: Record<string, unknown>;
    syncFrequency: 'manual' | 'daily' | 'weekly' | 'monthly';
    lastTestedAt: string | null;
    lastSuccessfulSyncAt: string | null;
    createdBy: string;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface SyncBatchRow {
    id: string;
    integrationSourceId: string;
    triggeredBy: string | null;
    sourceType: 'api_sync' | 'db_sync';
    triggerMode: 'manual' | 'scheduled';
    status: 'pending' | 'running' | 'success' | 'failed' | 'partial_success';
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    duplicateRecords: number;
    skippedRecords: number;
    requestId: string | null;
    correlationId: string | null;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface SyncBatchErrorRow {
    id: string;
    syncBatchId: string;
    sourceRecordIdentifier: string | null;
    errorCode: string;
    errorMessage: string;
    rawPayloadJson: Record<string, unknown> | null;
    createdAt: string;
}
export interface ReportExportRow {
    id: string;
    reportType: 'summary' | 'trends' | 'customer_portfolio' | 'wealth_manager' | 'upload_error' | 'audit';
    outputFormat: 'csv' | 'xlsx' | 'pdf';
    requestedBy: string;
    filtersJson: Record<string, unknown> | null;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    fileUrl: string | null;
    fileSizeBytes: number | null;
    checksum: string | null;
    errorMessage: string | null;
    requestId: string | null;
    correlationId: string | null;
    expiresAt: string | null;
    createdAt: string;
    completedAt: string | null;
}
export interface AuditLogRow {
    id: string;
    actorId: string | null;
    actorRole: string;
    actorType: ActorType;
    action: string;
    resourceType: string;
    resourceId: string;
    outcome: 'success' | 'failed' | 'partial_success';
    beforeJson: Record<string, unknown> | null;
    afterJson: Record<string, unknown> | null;
    metadataJson: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
    correlationId: string;
    createdAt: string;
}
export interface OutboxEventRow {
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    eventVersion: number;
    payloadJson: Record<string, unknown>;
    headersJson: Record<string, unknown> | null;
    correlationId: string;
    requestId: string | null;
    occurredAt: string;
    status: 'pending' | 'dispatched' | 'failed';
    attempts: number;
    nextAttemptAt: string | null;
    dispatchedAt: string | null;
    lastErrorMessage: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface JobHistoryRow {
    id: string;
    queueName: string;
    jobName: string;
    jobId: string;
    requestId: string | null;
    correlationId: string;
    actorSnapshotJson: Record<string, unknown> | null;
    sourceType: 'csv_upload' | 'api_sync' | 'db_sync' | 'report_export' | 'notification' | 'outbox';
    batchId: string | null;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'dead_lettered' | 'cancelled';
    attemptsMade: number;
    maxAttempts: number;
    errorMessage: string | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface SystemSettingRow {
    id: string;
    settingKey: string;
    settingValueJson: Record<string, unknown>;
    description: string | null;
    isSensitive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
}
export interface TenorBandRow {
    id: string;
    code: string;
    label: string;
    minDays: number;
    maxDays: number;
    displayOrder: number;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
}
export interface SourceChannelRow {
    id: string;
    code: string;
    name: string;
    description: string | null;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
}
