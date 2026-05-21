import { Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { MysqlInvestmentRecordRepository } from './repositories/mysql-investments.repository';
import { InvestmentsPolicy } from './policies/investments.policy';
import { CommissionFilters, InvestmentFilters } from './interfaces/investments.repositories';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly investmentsPolicy: InvestmentsPolicy,
    private readonly investmentRecordRepository: MysqlInvestmentRecordRepository,
  ) {}

  async list(actor: AuthenticatedActor, page = 1, pageSize = 50, filters: InvestmentFilters = {}): Promise<object> {
    this.investmentsPolicy.assertCanReadLedger(actor);
    const offset = (page - 1) * pageSize;
    const [items, totalItems] = await Promise.all([
      this.investmentRecordRepository.findAllPaged(offset, pageSize, filters),
      this.investmentRecordRepository.count(filters),
    ]);
    const totalInvestment = items.reduce((sum, r) => sum + Number(r.investmentAmount), 0);
    const confirmedValidCount = items.filter((r) => r.recordStatus === 'valid' && r.importStatus === 'confirmed').length;

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      summary: {
        recordCount: items.length,
        totalInvestment,
        confirmedValidCount,
      },
    };
  }

  async listCommissions(actor: AuthenticatedActor, page = 1, pageSize = 50, filters: CommissionFilters = {}): Promise<object> {
    this.investmentsPolicy.assertCanReadLedger(actor);
    const offset = (page - 1) * pageSize;
    const [items, summary] = await Promise.all([
      this.investmentRecordRepository.findAllWithCommissions(offset, pageSize, filters),
      this.investmentRecordRepository.commissionSummary(filters),
    ]);

    return {
      items,
      page,
      pageSize,
      totalItems: Number(summary.totalItems),
      totalPages: Math.ceil(Number(summary.totalItems) / pageSize),
      summary: {
        wmNtbTotal: Number(summary.wmNtbTotal ?? 0),
        wmRetnTotal: Number(summary.wmRetnTotal ?? 0),
        tmNtbTotal: Number(summary.tmNtbTotal ?? 0),
        tmRetnTotal: Number(summary.tmRetnTotal ?? 0),
        omNtbTotal: Number(summary.omNtbTotal ?? 0),
        omRetnTotal: Number(summary.omRetnTotal ?? 0),
        ooNtbTotal: Number(summary.ooNtbTotal ?? 0),
        ooRetnTotal: Number(summary.ooRetnTotal ?? 0),
        wpFundsTotal: Number(summary.wpFundsTotal ?? 0),
        wpTeamTotal: Number(summary.wpTeamTotal ?? 0),
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
