import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../../common/authenticated-actor';

@Injectable()
export class InvestmentsPolicy {
  assertCanReadCustomerPortfolio(actor: AuthenticatedActor | undefined): void {
    if (!actor?.permissions.includes('dashboard.customer_portfolio.read')) {
      throw new ForbiddenException('dashboard.customer_portfolio.read is required');
    }
  }
}