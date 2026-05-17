import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class SettingsPolicy {
  assertCanUpdate(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('settings.update')) {
      throw new ForbiddenException('settings.update is required');
    }
  }
}