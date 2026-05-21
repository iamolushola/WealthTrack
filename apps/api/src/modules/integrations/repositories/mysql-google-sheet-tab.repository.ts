import { Injectable } from '@nestjs/common';
import { GoogleSheetTabRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';

@Injectable()
export class MysqlGoogleSheetTabRepository {
  constructor(private readonly mysql: MysqlService) {}

  async upsert(tab: GoogleSheetTabRow): Promise<void> {
    await this.mysql.execute(
      `INSERT INTO google_sheet_tabs SET ?
       ON DUPLICATE KEY UPDATE
         sheet_title    = VALUES(sheet_title),
         range_notation = VALUES(range_notation),
         column_mapping = VALUES(column_mapping),
         status         = VALUES(status),
         updated_at     = VALUES(updated_at)`,
      [tab],
    );
  }

  findById(id: string): Promise<GoogleSheetTabRow | null> {
    return this.mysql.selectOne<GoogleSheetTabRow>(
      'SELECT * FROM google_sheet_tabs WHERE id = ? LIMIT 1',
      [id],
    );
  }

  listByIntegrationSourceId(integrationSourceId: string): Promise<GoogleSheetTabRow[]> {
    return this.mysql.selectMany<GoogleSheetTabRow>(
      'SELECT * FROM google_sheet_tabs WHERE integration_source_id = ? ORDER BY sheet_title ASC',
      [integrationSourceId],
    );
  }

  async updateTab(id: string, patch: Partial<Pick<GoogleSheetTabRow, 'columnMapping' | 'rangeNotation' | 'status'>>, updatedAt: string): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.columnMapping !== undefined) {
      fields.push('column_mapping = ?');
      params.push(JSON.stringify(patch.columnMapping));
    }
    if (patch.rangeNotation !== undefined) {
      fields.push('range_notation = ?');
      params.push(patch.rangeNotation);
    }
    if (patch.status !== undefined) {
      fields.push('status = ?');
      params.push(patch.status);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    params.push(updatedAt);
    params.push(id);

    await this.mysql.execute(`UPDATE google_sheet_tabs SET ${fields.join(', ')} WHERE id = ?`, params);
  }
}
