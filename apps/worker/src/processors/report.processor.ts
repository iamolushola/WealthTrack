import { Injectable, Logger } from '@nestjs/common';
import { InvestmentRecordRow, ReportExportRow } from '@wealthtrack/shared-types';
import { GenerateReportJob, REPORT_QUEUE } from '../queues/report.queue';
import { FileStorageService } from '../common/file-storage.service';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { nowIso } from '../common/utils/ids';
import { QueueProcessor } from './processor.interface';

@Injectable()
export class ReportProcessor implements QueueProcessor<GenerateReportJob> {
  readonly queueName = REPORT_QUEUE;
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly mysql: MysqlWorkerService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async handle(jobName: string, data: GenerateReportJob): Promise<{ status: string; reportExportId: string }> {
    const report = await this.mysql.selectOne<ReportExportRow>('SELECT * FROM report_exports WHERE id = ? LIMIT 1', [data.reportExportId]);
    if (!report) {
      throw new Error(`Report export ${data.reportExportId} not found`);
    }

    await this.mysql.execute('UPDATE report_exports SET status = ? WHERE id = ?', ['processing', data.reportExportId]);
    const investments = await this.mysql.selectMany<InvestmentRecordRow>(
      'SELECT * FROM investment_records WHERE record_status = ? AND import_status = ? ORDER BY mobilisation_date ASC',
      ['valid', 'confirmed'],
    );

    const csvLines = [
      'customer_id,customer_name,mobilisation_date,investment_amount,fund_type,tenor_category,relationship_manager',
      ...investments.map((record) =>
        [
          record.customerId,
          record.customerName,
          record.mobilisationDate,
          record.investmentAmount,
          record.fundType,
          record.tenorCategory,
          record.relationshipManager ?? '',
        ].join(','),
      ),
    ];
    const output = await this.fileStorageService.writeReport(data.reportExportId, csvLines.join('\n'), report.outputFormat === 'xlsx' ? 'csv' : report.outputFormat);

    await this.mysql.execute(
      'UPDATE report_exports SET status = ?, file_url = ?, file_size_bytes = ?, completed_at = ? WHERE id = ?',
      ['completed', output.filePath, output.size, nowIso(), data.reportExportId],
    );

    this.logger.log(`Processed ${jobName} for report ${data.reportExportId}`);
    return { status: 'completed', reportExportId: data.reportExportId };
  }
}
