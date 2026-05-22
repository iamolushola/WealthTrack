import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class InvestmentsPolicy {
  assertCanReadCustomerPortfolio(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('dashboard.customers.read')) {
      throw new ForbiddenException('dashboard.customers.read is required');
    }
  }

  assertCanReadLedger(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('dashboard.investments.read')) {
      throw new ForbiddenException('dashboard.investments.read is required');
    }
  }

  assertCanDeleteRecords(actor: AuthenticatedActor | undefined): void {
    if (actor?.actorType !== 'admin') {
      throw new ForbiddenException('Admin role is required to delete investment records');
    }
  }
}
