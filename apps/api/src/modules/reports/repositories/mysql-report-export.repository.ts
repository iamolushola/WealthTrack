import { Injectable } from '@nestjs/common';
import { ReportExportRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { ReportExportRepository } from '../interfaces/reports.repositories';

@Injectable()
export class MysqlReportExportRepository implements ReportExportRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(exportRow: ReportExportRow): Promise<void> {
    await this.mysql.execute('INSERT INTO report_exports SET ?', [exportRow]);
  }

  findById(id: string): Promise<ReportExportRow | null> {
    return this.mysql.selectOne<ReportExportRow>('SELECT * FROM report_exports WHERE id = ? LIMIT 1', [id]);
  }

  listByRequester(requesterId: string, cursor?: string, limit = 50): Promise<ReportExportRow[]> {
    if (cursor) {
      return this.mysql.selectMany<ReportExportRow>(
        'SELECT * FROM report_exports WHERE requested_by = ? AND id > ? ORDER BY id ASC LIMIT ?',
        [requesterId, cursor, limit],
      );
    }

    return this.mysql.selectMany<ReportExportRow>(
      'SELECT * FROM report_exports WHERE requested_by = ? ORDER BY created_at DESC LIMIT ?',
      [requesterId, limit],
    );
  }

  async updateStatus(id: string, status: ReportExportRow['status'], fileUrl?: string): Promise<void> {
    await this.mysql.execute('UPDATE report_exports SET status = ?, file_url = COALESCE(?, file_url) WHERE id = ?', [status, fileUrl ?? null, id]);
  }
}
