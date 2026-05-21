import { Controller, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express'; // eslint-disable-line @typescript-eslint/no-require-imports
import { JobDispatcherService } from '../../common/queues/job-dispatcher.service';
import { MysqlIntegrationSourceRepository } from './repositories/mysql-integration-source.repository';
import { MysqlSyncBatchRepository } from '../sync/repositories/mysql-sync.repositories';
import { createId, nowIso } from '../../common/utils/ids';

/**
 * Receives Google Drive push notifications when a watched spreadsheet changes.
 * Endpoint: POST /api/v1/integrations/google/webhook
 *
 * Registration:
 *   - Call the Drive API files.watch() once per integration source after creation.
 *   - Use the integration_source.id as the channel id (x-goog-channel-id header).
 *   - Set GOOGLE_WEBHOOK_SECRET in .env; pass it as the `token` field when registering.
 *   - Channels expire after 7 days — re-register via /api/v1/integrations/:id/renew-webhook.
 *
 * Security:
 *   - x-goog-channel-token is compared using a constant-time comparison to prevent timing attacks.
 *   - No actor auth guard needed — Google is the caller; token acts as the shared secret.
 */
@Controller('integrations/google/webhook')
export class GoogleSheetsWebhookController {
  constructor(
    private readonly jobDispatcher: JobDispatcherService,
    private readonly integrationSourceRepo: MysqlIntegrationSourceRepository,
    private readonly syncBatchRepo: MysqlSyncBatchRepository,
  ) {}

  @Post()
  async receive(
    @Req() _req: Request,
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-channel-token') token: string,
    @Headers('x-goog-resource-state') resourceState: string,
  ): Promise<void> {
    // Ignore non-change notifications (sync, sync-request, remove, etc.)
    if (!channelId || !['update', 'add', 'change'].includes(resourceState ?? '')) return;

    const expectedToken = process.env.GOOGLE_WEBHOOK_SECRET ?? '';
    if (!expectedToken) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    // Constant-time comparison to avoid timing oracle attacks
    const tokenBuf = Buffer.from(token ?? '');
    const expectedBuf = Buffer.from(expectedToken);
    const lengthsMatch = tokenBuf.length === expectedBuf.length;
    const safe = Buffer.alloc(Math.max(tokenBuf.length, expectedBuf.length));
    tokenBuf.copy(safe);
    const paddedExpected = Buffer.alloc(safe.length);
    expectedBuf.copy(paddedExpected);
    if (!lengthsMatch || !timingSafeEqual(safe, paddedExpected)) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    // channelId matches integration_sources.id (set during channel registration)
    const source = await this.integrationSourceRepo.findById(channelId);
    if (!source || source.sourceType !== 'google_sheets' || source.status !== 'active') return;

    const syncBatchId = createId();
    const correlationId = createId();

    await this.syncBatchRepo.create({
      id: syncBatchId,
      integrationSourceId: source.id,
      triggeredBy: null,
      sourceType: 'api_sync',
      triggerMode: 'scheduled',
      status: 'pending',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      skippedRecords: 0,
      requestId: null,
      correlationId,
      startedAt: nowIso(),
      completedAt: null,
      errorMessage: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    await this.jobDispatcher.enqueueGoogleSheetsSync({
      integrationSourceId: source.id,
      syncBatchId,
      tabIds: [],
      actorId: 'system',
      requestId: createId(),
      correlationId,
      triggerMode: 'webhook',
    });
  }
}
