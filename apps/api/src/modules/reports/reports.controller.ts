import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateReportExportRequestDto } from './dto/requests/create-report-export.request.dto';
import { ReportsService } from './reports.service';

@UseGuards(PermissionGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermissions('reports.export')
  @Post('export')
  createExport(
    @Body() payload: CreateReportExportRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.reportsService.createExport(payload, actor);
  }

  @RequirePermissions('reports.export')
  @Get()
  list(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.reportsService.list(actor);
  }

  @RequirePermissions('reports.export')
  @Get(':id')
  getById(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.reportsService.getById(id, actor);
  }

  @RequirePermissions('reports.export')
  @Get(':id/download')
  download(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.reportsService.download(id, actor);
  }
}
