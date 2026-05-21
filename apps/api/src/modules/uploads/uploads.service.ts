import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
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
  private readonly logger = new Logger(UploadsService.name);

  private readonly fileServiceUrl: string;
  private readonly fileServiceApiKey: string;
  private readonly useMockStorage: boolean;

  constructor(
    private readonly uploadsPolicy: UploadsPolicy,
    private readonly uploadBatchRepository: MysqlUploadBatchRepository,
    private readonly uploadBatchRowRepository: MysqlUploadBatchRowRepository,
    private readonly uploadValidationErrorRepository: MysqlUploadValidationErrorRepository,
    private readonly importsService: ImportsService,
    private readonly jobDispatcherService: JobDispatcherService,
    private readonly outboxService: OutboxService,
  ) {
    this.fileServiceUrl = (process.env.CREDPAL_FILE_SERVICE_URL ?? 'https://fileservice.credpal.com').replace(/\/$/, '');
    this.fileServiceApiKey = process.env.CREDPAL_FILE_SERVICE_API_KEY ?? '';
    this.useMockStorage = process.env.USE_MOCK_FILE_STORAGE === 'true' || !this.fileServiceApiKey;
  }

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
    try {
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
    } catch (error) {
      await this.uploadBatchRepository.updateStatus(batch.id, 'failed');
      const message = error instanceof Error ? error.message : 'Unknown queue error';
      this.logger.error(`Failed to enqueue CSV upload ${batch.id}: ${message}`);
      throw new ServiceUnavailableException('CSV upload queue is unavailable. Start Redis and the worker, then try again.');
    }
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
    const items = await this.uploadBatchRepository.listAll();
    return { items, count: items.length };
  }

  async bulkDeleteAll(actor: AuthenticatedActor): Promise<object> {
    this.uploadsPolicy.assertCanManageAll(actor);
    const deleted = await this.uploadBatchRepository.deleteAll();
    return { deleted, message: `${deleted} upload batch${deleted !== 1 ? 'es' : ''} permanently removed` };
  }

  async bulkDeleteByIds(ids: string[], actor: AuthenticatedActor): Promise<object> {
    this.uploadsPolicy.assertCanManageAll(actor);
    if (!Array.isArray(ids) || ids.length === 0) {
      return { deleted: 0, message: 'No IDs provided' };
    }
    const deleted = await this.uploadBatchRepository.deleteByIds(ids);
    return { deleted, message: `${deleted} upload batch${deleted !== 1 ? 'es' : ''} and linked investment records permanently removed` };
  }

  async ingestCsv(
    fileBuffer: Buffer,
    originalName: string,
    actor: AuthenticatedActor,
  ): Promise<object> {
    this.uploadsPolicy.assertCanCreateCsvUpload(actor);

    const checksum = createHash('sha256').update(fileBuffer).digest('hex');
    let fileUrl: string;

    fileUrl = await this.storeUploadedCsv(fileBuffer, originalName);

    const now = nowIso();
    const batch: UploadBatchRow = {
      id: createId(),
      fileName: originalName,
      fileUrl,
      fileChecksum: checksum,
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
    try {
      await this.jobDispatcherService.enqueueCsvProcessing({
        batchId: batch.id,
        requestId: createId(),
        correlationId: createId(),
      });
      await this.outboxService.queue('csv.uploaded', 'upload_batch', batch.id, {
        batchId: batch.id,
        uploadedBy: actor.actorId,
        fileName: batch.fileName,
        fileUrl: batch.fileUrl,
      });
    } catch (error) {
      await this.uploadBatchRepository.updateStatus(batch.id, 'failed');
      const message = error instanceof Error ? error.message : 'Unknown queue error';
      this.logger.error(`Failed to enqueue CSV upload ${batch.id}: ${message}`);
      throw new ServiceUnavailableException('CSV upload queue is unavailable. Start Redis and the worker, then try again.');
    }

    return batch;
  }

  private async uploadToCredPal(buffer: Buffer, fileName: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: 'text/csv' });
    formData.append('file', blob, fileName);

    const response = await fetch(`${this.fileServiceUrl}/upload`, {
      method: 'POST',
      headers: { 'x-api-key': this.fileServiceApiKey },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`CredPal File Service upload failed (HTTP ${response.status}): ${text}`);
    }

    const data = await response.json() as { url?: string; fileUrl?: string; data?: { url?: string } };
    const url = data.url ?? data.fileUrl ?? data.data?.url;
    if (!url) {
      throw new Error(`CredPal File Service returned no URL. Response: ${JSON.stringify(data)}`);
    }
    return url;
  }

  private async storeUploadedCsv(buffer: Buffer, originalName: string): Promise<string> {
    if (this.useMockStorage) {
      return this.writeLocalUpload(buffer, originalName);
    }

    try {
      const fileUrl = await this.uploadToCredPal(buffer, originalName);
      this.logger.log(`CSV uploaded to cloud: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown file service error';
      this.logger.warn(`Cloud CSV upload failed; falling back to local file storage. ${message}`);
      return this.writeLocalUpload(buffer, originalName);
    }
  }

  private async writeLocalUpload(buffer: Buffer, originalName: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);
    const fileUrl = `file://${filePath}`;
    this.logger.log(`[local] CSV saved locally: ${fileUrl}`);
    return fileUrl;
  }
}
