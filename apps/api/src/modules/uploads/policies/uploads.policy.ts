import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class UploadsPolicy {
  assertCanReadPreview(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('uploads.preview.read')) {
      throw new ForbiddenException('uploads.preview.read is required');
    }
  }

  assertCanConfirmImport(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('uploads.import.confirm')) {
      throw new ForbiddenException('uploads.import.confirm is required');
    }
  }
}
