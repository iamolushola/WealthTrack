import { ReportExportRow } from '@wealthtrack/shared-types';

export interface ReportExportRepository {
  create(exportRow: ReportExportRow): Promise<void>;
  findById(id: string): Promise<ReportExportRow | null>;
  listByRequester(requesterId: string, cursor?: string, limit?: number): Promise<ReportExportRow[]>;
  updateStatus(id: string, status: ReportExportRow['status'], fileUrl?: string): Promise<void>;
}
