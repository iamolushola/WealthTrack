import { Injectable } from '@nestjs/common';
import { AuditLogRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { AuditLogRepository } from '../interfaces/audit.repositories';

@Injectable()
export class MysqlAuditLogRepository implements AuditLogRepository {
  constructor(private readonly mysql: MysqlService) {}

  async append(entry: AuditLogRow): Promise<void> {
    await this.mysql.execute('INSERT INTO audit_logs SET ?', [entry]);
  }

  list(): Promise<AuditLogRow[]> {
    return this.mysql.selectMany<AuditLogRow>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 250');
  }
}
