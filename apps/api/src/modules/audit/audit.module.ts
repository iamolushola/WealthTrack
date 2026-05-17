import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditPolicy } from './policies/audit.policy';
import { MysqlAuditLogRepository } from './repositories/mysql-audit-log.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditPolicy, MysqlAuditLogRepository],
  exports: [AuditService],
})
export class AuditModule {}
