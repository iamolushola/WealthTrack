import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class ReportsPolicy {
  assertCanExport(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('reports.export')) {
      throw new ForbiddenException('reports.export is required');
    }
  }
}
