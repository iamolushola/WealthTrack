import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { UploadsPolicy } from './policies/uploads.policy';
import { CreateCsvUploadRequestDto } from './dto/requests/create-csv-upload.request.dto';
import {
  MysqlUploadBatchRepository,
  MysqlUploadBatchRowRepository,
  MysqlUploadValidationErrorRepository,
} from './repositories/mysql-uploads.repositories';
import { createId, nowIso } from '../../common/utils/ids';
import { UploadBatchRow } from '@wealthtrack/shared-types';
import { ImportsService } from '../imports/imports.service';
import { JobDispatcherService } from '../../common/queues/job-dispatcher.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly uploadsPolicy: UploadsPolicy,
    private readonly uploadBatchRepository: MysqlUploadBatchRepository,
    private readonly uploadBatchRowRepository: MysqlUploadBatchRowRepository,
    private readonly uploadValidationErrorRepository: MysqlUploadValidationErrorRepository,
    private readonly importsService: ImportsService,
    private readonly jobDispatcherService: JobDispatcherService,
    private readonly outboxService: OutboxService,
  ) {}

  async createCsvUpload(payload: CreateCsvUploadRequestDto, actor: AuthenticatedActor): Promise<object> {
    const now = nowIso();
    const batch: UploadBatchRow = {
      id: createId(),
      fileName: payload.fileName,
      fileUrl: payload.fileUrl,
      fileChecksum: payload.fileChecksum,
      uploadedBy: actor.actorId,
      status: 'pending',
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      skippedRows: 0,
      previewExpiresAt: null,
      errorFileUrl: null,
      processingStartedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.actorId,
      updatedBy: actor.actorId,
    };

    await this.uploadBatchRepository.create(batch);
    await this.jobDispatcherService.enqueueCsvProcessing({
      batchId: batch.id,
      requestId: createId(),
      correlationId: createId(),
    });
    await this.outboxService.queue('csv.uploaded', 'upload_batch', batch.id, {
      batchId: batch.id,
      uploadedBy: actor.actorId,
      fileName: batch.fileName,
    });
    return batch;
  }

  async preview(batchId: string, actor: AuthenticatedActor): Promise<object> {
    this.uploadsPolicy.assertCanReadPreview(actor);
    const batch = await this.uploadBatchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Upload batch not found');
    }

    const rows = await this.uploadBatchRowRepository.listByBatchId(batchId);
    const errors = await this.uploadValidationErrorRepository.listByBatchId(batchId);
    return { batch, rows, errors };
  }

  async confirm(batchId: string, actor: AuthenticatedActor): Promise<object> {
    this.uploadsPolicy.assertCanConfirmImport(actor);
    return this.importsService.confirmBatch(batchId, `${batchId}:${actor.actorId}`, actor);
  }

  async cancel(batchId: string, actor: AuthenticatedActor): Promise<object> {
    this.uploadsPolicy.assertCanConfirmImport(actor);
    const batch = await this.uploadBatchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Upload batch not found');
    }

    await this.uploadBatchRepository.updateStatus(batchId, 'cancelled');
    return { ...batch, status: 'cancelled' };
  }

  async errors(batchId: string, actor: AuthenticatedActor): Promise<object> {
    this.uploadsPolicy.assertCanReadPreview(actor);
    const batch = await this.uploadBatchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Upload batch not found');
    }

    const errors = await this.uploadValidationErrorRepository.listByBatchId(batchId);
    return { batchId, count: errors.length, items: errors };
  }

  async errorReport(batchId: string, actor: AuthenticatedActor): Promise<object> {
    this.uploadsPolicy.assertCanReadPreview(actor);
    const batch = await this.uploadBatchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Upload batch not found');
    }

    return {
      batchId,
      errorFileUrl: batch.errorFileUrl,
      hasGeneratedReport: Boolean(batch.errorFileUrl),
    };
  }

  async history(actor: AuthenticatedActor): Promise<object> {
    const items = await this.uploadBatchRepository.listByUploader(actor.actorId);
    return { items, count: items.length };
  }
}
