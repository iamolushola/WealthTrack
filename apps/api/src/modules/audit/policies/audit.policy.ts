import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class AuditPolicy {
  assertCanRead(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('audit.logs.read')) {
      throw new ForbiddenException('audit.logs.read is required');
    }
  }
}
