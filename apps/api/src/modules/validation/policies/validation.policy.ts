import { ForbiddenException, Injectable } from '@nestjs/common';
import { UploadBatchRow } from '@wealthtrack/shared-types';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class ValidationPolicy {
  assertCanReadBatch(actor: AuthenticatedActor | undefined, batch: UploadBatchRow): void {
    if (!actor?.permissions.includes('uploads.preview.read')) {
      throw new ForbiddenException('uploads.preview.read is required');
    }

    if (batch.uploadedBy !== actor.actorId) {
      throw new ForbiddenException('You can only view validation for your own upload batches');
    }
  }
}