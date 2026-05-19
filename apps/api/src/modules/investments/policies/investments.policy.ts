import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class InvestmentsPolicy {
  assertCanReadCustomerPortfolio(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('dashboard.customer_portfolio.read')) {
      throw new ForbiddenException('dashboard.customer_portfolio.read is required');
    }
  }

  assertCanReadLedger(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('dashboard.summary.read') && !actor?.permissions.includes('dashboard.customer_portfolio.read')) {
      throw new ForbiddenException('dashboard.summary.read or dashboard.customer_portfolio.read is required');
    }
  }

  assertCanDeleteRecords(actor: AuthenticatedActor | undefined): void {
    if (actor?.actorType !== 'admin') {
      throw new ForbiddenException('Admin role is required to delete investment records');
    }
  }
}
