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

  async list(actor: AuthenticatedActor, limit = 50, cursor?: string): Promise<object> {
    this.investmentsPolicy.assertCanReadLedger(actor);
    const items = await this.investmentRecordRepository.findAll(cursor, limit);
    const nextCursor = items.length === limit ? (items[items.length - 1]?.id ?? null) : null;
    const totalInvestment = items.reduce((sum, r) => sum + Number(r.investmentAmount), 0);
    const confirmedValidCount = items.filter((r) => r.recordStatus === 'valid' && r.importStatus === 'confirmed').length;

    return {
      items,
      count: items.length,
      nextCursor,
      summary: {
        recordCount: items.length,
        totalInvestment,
        confirmedValidCount,
      },
    };
  }

  async bulkDeleteByIds(ids: string[], actor: AuthenticatedActor): Promise<object> {
    this.investmentsPolicy.assertCanDeleteRecords(actor);
    if (!Array.isArray(ids) || ids.length === 0) {
      return { deleted: 0, message: 'No IDs provided' };
    }
    const deleted = await this.investmentRecordRepository.deleteByIds(ids);
    return { deleted, message: `${deleted} investment record${deleted !== 1 ? 's' : ''} permanently removed` };
  }

  async bulkDeleteByCustomerIds(customerIds: string[], actor: AuthenticatedActor): Promise<object> {
    this.investmentsPolicy.assertCanDeleteRecords(actor);
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return { deleted: 0, message: 'No customer IDs provided' };
    }

    const uniqueCustomerIds = Array.from(new Set(customerIds.map((id) => String(id).trim()).filter(Boolean)));
    if (uniqueCustomerIds.length === 0) {
      return { deleted: 0, message: 'No customer IDs provided' };
    }

    const deleted = await this.investmentRecordRepository.deleteByCustomerIds(uniqueCustomerIds);
    return {
      deleted,
      customers: uniqueCustomerIds.length,
      message: `${deleted} investment record${deleted !== 1 ? 's' : ''} permanently removed for ${uniqueCustomerIds.length} customer${uniqueCustomerIds.length !== 1 ? 's' : ''}`,
    };
  }

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
