import { Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { AuditPolicy } from './policies/audit.policy';
import { MysqlAuditLogRepository } from './repositories/mysql-audit-log.repository';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditPolicy: AuditPolicy,
    private readonly auditLogRepository: MysqlAuditLogRepository,
  ) {}

  async list(actor: AuthenticatedActor): Promise<object> {
    this.auditPolicy.assertCanRead(actor);
    const items = await this.auditLogRepository.list();
    return { items, count: items.length };
  }

  async export(actor: AuthenticatedActor): Promise<object> {
    this.auditPolicy.assertCanRead(actor);
    const items = await this.auditLogRepository.list();
    const csv = [
      'id,action,resource_type,resource_id,outcome,created_at',
      ...items.map((item) => [item.id, item.action, item.resourceType, item.resourceId, item.outcome, item.createdAt].join(',')),
    ].join('\n');
    return { count: items.length, csv };
  }
}
