import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateCsvUploadRequestDto } from './dto/requests/create-csv-upload.request.dto';
import { UploadsService } from './uploads.service';

@UseGuards(PermissionGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @RequirePermissions('uploads.csv.create')
  @Post('csv')
  createCsvUpload(
    @Body() payload: CreateCsvUploadRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.uploadsService.createCsvUpload(payload, actor);
  }

  @RequirePermissions('uploads.csv.create')
  @Post('ingest')
  @UseInterceptors(FileInterceptor('file'))
  async ingest(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    if (!file) {
      throw new BadRequestException('No CSV file provided');
    }
    return this.uploadsService.ingestCsv(file.buffer, file.originalname, actor);
  }

  @RequirePermissions('uploads.preview.read')
  @Get(':batchId/preview')
  preview(@Param('batchId') batchId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.uploadsService.preview(batchId, actor);
  }

  @RequirePermissions('uploads.import.confirm')
  @Post(':batchId/confirm')
  confirm(@Param('batchId') batchId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.uploadsService.confirm(batchId, actor);
  }

  @RequirePermissions('uploads.import.confirm')
  @Post(':batchId/cancel')
  cancel(@Param('batchId') batchId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.uploadsService.cancel(batchId, actor);
  }

  @RequirePermissions('uploads.preview.read')
  @Get(':batchId/errors')
  errors(@Param('batchId') batchId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.uploadsService.errors(batchId, actor);
  }

  @RequirePermissions('uploads.preview.read')
  @Get(':batchId/error-report')
  errorReport(@Param('batchId') batchId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.uploadsService.errorReport(batchId, actor);
  }

  @RequirePermissions('uploads.history.read')
  @Get('history')
  history(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.uploadsService.history(actor);
  }

  @RequirePermissions('uploads.csv.create')
  @Delete()
  bulkDelete(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() body: { ids?: string[] },
  ): Promise<object> {
    if (Array.isArray(body?.ids) && body.ids.length > 0) {
      return this.uploadsService.bulkDeleteByIds(body.ids, actor);
    }
    return this.uploadsService.bulkDeleteAll(actor);
  }
}
