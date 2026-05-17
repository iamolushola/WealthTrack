import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { ReportsPolicy } from './policies/reports.policy';
import { MysqlReportExportRepository } from './repositories/mysql-report-export.repository';
import { CreateReportExportRequestDto } from './dto/requests/create-report-export.request.dto';
import { createId, nowIso } from '../../common/utils/ids';
import { ReportExportRow } from '@wealthtrack/shared-types';
import { JobDispatcherService } from '../../common/queues/job-dispatcher.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsPolicy: ReportsPolicy,
    private readonly reportExportRepository: MysqlReportExportRepository,
    private readonly jobDispatcherService: JobDispatcherService,
    private readonly outboxService: OutboxService,
  ) {}

  async createExport(payload: CreateReportExportRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.reportsPolicy.assertCanExport(actor);
    const report: ReportExportRow = {
      id: createId(),
      reportType: payload.reportType,
      outputFormat: payload.outputFormat,
      requestedBy: actor.actorId,
      filtersJson: payload.filtersJson ?? null,
      status: 'pending',
      fileUrl: null,
      fileSizeBytes: null,
      checksum: null,
      errorMessage: null,
      requestId: null,
      correlationId: null,
      expiresAt: null,
      createdAt: nowIso(),
      completedAt: null,
    };

    await this.reportExportRepository.create(report);
    await this.jobDispatcherService.enqueueReport({
      reportExportId: report.id,
      requestId: createId(),
      correlationId: createId(),
    });
    await this.outboxService.queue('report.export.requested', 'report_export', report.id, {
      reportExportId: report.id,
      requestedBy: actor.actorId,
    });
    return report;
  }

  async list(actor: AuthenticatedActor): Promise<object> {
    this.reportsPolicy.assertCanExport(actor);
    const items = await this.reportExportRepository.listByRequester(actor.actorId);
    return { items, count: items.length };
  }

  async getById(id: string, actor: AuthenticatedActor): Promise<object> {
    this.reportsPolicy.assertCanExport(actor);
    const report = await this.reportExportRepository.findById(id);
    if (!report) {
      throw new NotFoundException('Report export not found');
    }

    return report;
  }

  async download(id: string, actor: AuthenticatedActor): Promise<object> {
    this.reportsPolicy.assertCanExport(actor);
    const report = await this.reportExportRepository.findById(id);
    if (!report) {
      throw new NotFoundException('Report export not found');
    }

    return {
      id: report.id,
      status: report.status,
      fileUrl: report.fileUrl,
      expiresAt: report.expiresAt,
    };
  }
}
