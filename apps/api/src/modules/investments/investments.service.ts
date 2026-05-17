import { Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { MysqlInvestmentRecordRepository } from './repositories/mysql-investments.repository';
import { InvestmentsPolicy } from './policies/investments.policy';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly investmentsPolicy: InvestmentsPolicy,
    private readonly investmentRecordRepository: MysqlInvestmentRecordRepository,
  ) {}

  async customerHistory(customerId: string, actor: AuthenticatedActor): Promise<object> {
    this.investmentsPolicy.assertCanReadCustomerPortfolio(actor);
    const items = await this.investmentRecordRepository.findByCustomerId(customerId);

    return {
      customerId,
      items,
      count: items.length,
      confirmedValidCount: items.filter(
        (item) => item.recordStatus === 'valid' && item.importStatus === 'confirmed',
      ).length,
    };
  }
}
