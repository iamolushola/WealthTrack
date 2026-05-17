import { ForbiddenException, Injectable } from '@nestjs/common';
import { IntegrationSourceRow, SyncBatchRow } from '@wealthtrack/shared-types';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class SyncPolicy {
  assertCanReadBatch(
    actor: AuthenticatedActor | undefined,
    syncBatch: SyncBatchRow,
    integrationSource: IntegrationSourceRow,
  ): void {
    if (!actor?.permissions.includes('integrations.logs.read')) {
      throw new ForbiddenException('integrations.logs.read is required');
    }

    const ownsBatch = syncBatch.triggeredBy === actor.actorId;
    const ownsSource = integrationSource.createdBy === actor.actorId;
    if (!ownsBatch && !ownsSource) {
      throw new ForbiddenException('You can only view sync batches you created or triggered');
    }
  }
}