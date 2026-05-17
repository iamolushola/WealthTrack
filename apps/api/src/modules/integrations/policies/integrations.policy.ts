import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class IntegrationsPolicy {
  assertCanManage(actor: AuthenticatedActor | undefined, permission: string): void {
    if (!actor?.permissions.includes(permission)) {
      throw new ForbiddenException(`${permission} is required`);
    }
  }
}
