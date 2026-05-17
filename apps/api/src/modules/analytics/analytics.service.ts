import { Injectable } from '@nestjs/common';
import { MysqlAnalyticsInvestmentRepository } from './repositories/mysql-analytics.repositories';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsInvestmentRepository: MysqlAnalyticsInvestmentRepository) {}

  async summary(): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();
    const totalInvestment = investments.reduce((sum, record) => sum + Number(record.investmentAmount), 0);
    const uniqueCustomers = new Set(investments.map((record) => record.customerId)).size;
    return {
      totalInvestment,
      uniqueCustomers,
      averageInvestment: investments.length ? totalInvestment / investments.length : 0,
      count: investments.length,
    };
  }

  async trends(): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();
    const byDate = investments.reduce<Record<string, number>>((result, record) => {
      result[record.mobilisationDate] = (result[record.mobilisationDate] ?? 0) + Number(record.investmentAmount);
      return result;
    }, {});
    return { items: Object.entries(byDate).map(([date, amount]) => ({ date, amount })) };
  }

  async customerPortfolio(): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();
    const byCustomer = investments.reduce<Record<string, { customerName: string; total: number }>>((result, record) => {
      const current = result[record.customerId] ?? { customerName: record.customerName, total: 0 };
      current.total += Number(record.investmentAmount);
      result[record.customerId] = current;
      return result;
    }, {});

    return {
      items: Object.entries(byCustomer)
        .map(([customerId, value]) => ({ customerId, customerName: value.customerName, totalInvestment: value.total }))
        .sort((left, right) => right.totalInvestment - left.totalInvestment),
    };
  }

  async customerPortfolioDetail(customerId: string): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();
    const items = investments.filter((record) => record.customerId === customerId);
    return { customerId, items };
  }

  async wealthManagers(): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();
    const byManager = investments.reduce<Record<string, number>>((result, record) => {
      const manager = record.relationshipManager ?? 'Unassigned';
      result[manager] = (result[manager] ?? 0) + Number(record.investmentAmount);
      return result;
    }, {});
    return {
      items: Object.entries(byManager)
        .map(([relationshipManager, totalInvestment]) => ({ relationshipManager, totalInvestment }))
        .sort((left, right) => right.totalInvestment - left.totalInvestment),
    };
  }
}
