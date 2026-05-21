import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfirmImportRequestDto } from './dto/requests/confirm-import.request.dto';
import { MysqlIdempotencyKeyRepository, MysqlImportInvestmentRepository } from './repositories/mysql-imports.repositories';
import { MysqlUploadBatchRepository, MysqlUploadBatchRowRepository } from '../uploads/repositories/mysql-uploads.repositories';
import { MysqlInvestmentRecordRepository } from '../investments/repositories/mysql-investments.repository';
import { createId, nowIso, sha256 } from '../../common/utils/ids';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { InvestmentRecordRow } from '@wealthtrack/shared-types';
import { JobDispatcherService } from '../../common/queues/job-dispatcher.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class ImportsService {
  constructor(
    private readonly idempotencyKeyRepository: MysqlIdempotencyKeyRepository,
    private readonly importInvestmentRepository: MysqlImportInvestmentRepository,
    private readonly uploadBatchRepository: MysqlUploadBatchRepository,
    private readonly uploadBatchRowRepository: MysqlUploadBatchRowRepository,
    private readonly investmentRecordRepository: MysqlInvestmentRecordRepository,
    private readonly jobDispatcherService: JobDispatcherService,
    private readonly outboxService: OutboxService,
  ) {}

  async confirm(payload: ConfirmImportRequestDto, actor?: AuthenticatedActor): Promise<object> {
    return this.confirmBatch(payload.batchId, payload.idempotencyKey, actor);
  }

  async confirmBatch(batchId: string, idempotencyKey: string, actor?: AuthenticatedActor): Promise<object> {
    const existingKey = await this.idempotencyKeyRepository.findByScopeAndKey('upload_confirm', idempotencyKey);
    if (existingKey?.responseBodyJson) {
      // Only honour the cached response if the batch was actually imported.
      // If the batch is still 'validated' or 'importing' the previous import job crashed before
      // completion — delete the stale key and re-enqueue.
      const batch = await this.uploadBatchRepository.findById(batchId);
      if (batch?.status !== 'validated' && batch?.status !== 'importing' && batch?.status !== 'partially_imported') {
        return existingKey.responseBodyJson;
      }
      await this.idempotencyKeyRepository.deleteByScopeAndKey('upload_confirm', idempotencyKey);
    }

    const batch = await this.uploadBatchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Upload batch not found');
    }

    await this.idempotencyKeyRepository.create({
      id: createId(),
      idempotencyKey,
      scope: 'upload_confirm',
      actorId: actor?.actorId ?? batch.uploadedBy,
      resourceType: 'upload_batch',
      resourceId: batchId,
      requestHash: sha256(idempotencyKey),
      responseStatus: 202,
      responseBodyJson: {
        batchId,
        status: 'queued',
      },
      lockedUntil: null,
      createdAt: nowIso(),
      expiresAt: nowIso(new Date(Date.now() + 1000 * 60 * 60 * 24)),
    });

    await this.jobDispatcherService.enqueueImport({
      batchId,
      actorId: actor?.actorId ?? batch.uploadedBy,
      requestId: createId(),
      correlationId: createId(),
    });
    await this.outboxService.queue('investment.import.requested', 'upload_batch', batchId, {
      batchId,
      actorId: actor?.actorId ?? batch.uploadedBy,
    });

    return {
      batchId,
      status: 'queued',
      idempotencyKey,
    };
  }

  async runImport(batchId: string, actorId: string): Promise<object> {
    const batch = await this.uploadBatchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Upload batch not found');
    }

    const rows = await this.uploadBatchRowRepository.listByBatchId(batchId);
    const validRows = rows.filter((row) => row.rowStatus === 'valid');
    const insertedRecords: InvestmentRecordRow[] = [];

    for (const row of validRows) {
      if (row.investmentReference) {
        const existingByReference = await this.investmentRecordRepository.findByReference(row.investmentReference);
        if (existingByReference) {
          continue;
        }
      }

      if (row.sourceRecordHash) {
        const existingByHash = await this.investmentRecordRepository.findBySourceHash(row.sourceRecordHash);
        if (existingByHash) {
          continue;
        }
      }

      insertedRecords.push({
        id: createId(),
        customerId: row.customerId ?? 'unknown',
        customerName: row.customerName ?? 'Unknown Customer',
        customerType: row.customerType ?? 'returning',
        mobilisationDate: row.mobilisationDate ?? nowIso().slice(0, 10),
        investmentAmount: row.investmentAmount ?? '0.0000',
        fundType: row.fundType ?? 'inflow',
        tenorDays: row.tenorDays ?? 30,
        tenorCategory: row.tenorCategory ?? 'unclassified',
        maturityDate: row.maturityDate,
        investmentReference: row.investmentReference,
        currency: row.currency,
        sourceChannel: row.sourceChannel,
        relationshipManager: row.relationshipManager,
        costOfFunds: row.costOfFunds,
        importBatchId: batchId,
        uploadBatchRowId: row.id,
        syncBatchId: null,
        dataSource: 'csv_upload',
        importStatus: 'confirmed',
        recordStatus: 'valid',
        sourceRecordHash: row.sourceRecordHash,
        confirmedBy: actorId,
        confirmedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: actorId,
        updatedBy: actorId,
      });
    }

    if (insertedRecords.length > 0) {
      await this.importInvestmentRepository.insertConfirmed(insertedRecords);
    }

    const finalStatus = insertedRecords.length === validRows.length ? 'imported' : 'partially_imported';
    await this.uploadBatchRepository.updateStatus(batchId, finalStatus);

    const response = {
      batchId,
      importedCount: insertedRecords.length,
      skippedCount: validRows.length - insertedRecords.length,
      status: finalStatus,
      recordIds: insertedRecords.map((record) => record.id),
    };

    return response;
  }
}
