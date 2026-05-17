import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class UsersPolicy {
  assertCanRead(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('users.read')) {
      throw new ForbiddenException('users.read is required');
    }
  }

  assertCanManage(actor: AuthenticatedActor | undefined, permission: 'users.create' | 'users.update' | 'users.deactivate'): void {
    if (!actor?.permissions.includes(permission)) {
      throw new ForbiddenException(`${permission} is required`);
    }
  }
}
