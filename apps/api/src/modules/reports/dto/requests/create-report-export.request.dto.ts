import { IsEnum, IsObject, IsOptional } from 'class-validator';

export class CreateReportExportRequestDto {
  @IsEnum(['summary', 'trends', 'customer_portfolio', 'wealth_manager', 'upload_error', 'audit'])
  reportType!: 'summary' | 'trends' | 'customer_portfolio' | 'wealth_manager' | 'upload_error' | 'audit';

  @IsEnum(['csv', 'xlsx', 'pdf'])
  outputFormat!: 'csv' | 'xlsx' | 'pdf';

  @IsOptional()
  @IsObject()
  filtersJson?: Record<string, unknown>;
}
