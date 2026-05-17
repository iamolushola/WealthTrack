import { AuditLogRow } from '@wealthtrack/shared-types';

export interface AuditLogRepository {
  append(entry: AuditLogRow): Promise<void>;
  list(filters?: Record<string, unknown>): Promise<AuditLogRow[]>;
}
