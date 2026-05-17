import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsPolicy } from './policies/reports.policy';
import { MysqlReportExportRepository } from './repositories/mysql-report-export.repository';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPolicy, MysqlReportExportRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
