import { Injectable } from '@nestjs/common';
import { InvestmentRecordRow } from '@wealthtrack/shared-types';
import { MysqlAnalyticsInvestmentRepository } from './repositories/mysql-analytics.repositories';

type FundsAgingBucket = { investmentCount: number; investmentValue: number };
type FundsAgingBuckets = {
  days0To90: FundsAgingBucket;
  days120To210: FundsAgingBucket;
  days240To330: FundsAgingBucket;
  days366Plus: FundsAgingBucket;
  unclassified: FundsAgingBucket;
};

function emptyAgingBuckets(): FundsAgingBuckets {
  return {
    days0To90: { investmentCount: 0, investmentValue: 0 },
    days120To210: { investmentCount: 0, investmentValue: 0 },
    days240To330: { investmentCount: 0, investmentValue: 0 },
    days366Plus: { investmentCount: 0, investmentValue: 0 },
    unclassified: { investmentCount: 0, investmentValue: 0 },
  };
}

function classifyAgingBucket(tenorDays: number): keyof FundsAgingBuckets {
  if (tenorDays >= 0 && tenorDays <= 90) return 'days0To90';
  if (tenorDays >= 120 && tenorDays <= 210) return 'days120To210';
  if (tenorDays >= 240 && tenorDays <= 330) return 'days240To330';
  if (tenorDays >= 366) return 'days366Plus';
  return 'unclassified';
}

function accumulateAgingBucket(buckets: FundsAgingBuckets, record: InvestmentRecordRow): void {
  const key = classifyAgingBucket(record.tenorDays);
  buckets[key].investmentCount += 1;
  buckets[key].investmentValue += Number(record.investmentAmount);
}

function tenorCategoryLabel(category: string): string {
  return category.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function isoMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isoQuarter(date: Date): string {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function isoYear(date: Date): string {
  return String(date.getFullYear());
}

function buildSeriesPoints(
  investments: InvestmentRecordRow[],
  keyFn: (d: Date) => string,
): Array<{ period: string; totalInvestment: number; investmentCount: number }> {
  const buckets = new Map<string, { totalInvestment: number; investmentCount: number }>();

  for (const record of investments) {
    const d = new Date(record.mobilisationDate);
    if (Number.isNaN(d.getTime())) continue;
    const key = keyFn(d);
    const existing = buckets.get(key) ?? { totalInvestment: 0, investmentCount: 0 };
    existing.totalInvestment += Number(record.investmentAmount);
    existing.investmentCount += 1;
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({ period, ...v }));
}

function buildBreakdownPoints(
  investments: InvestmentRecordRow[],
  keyFn: (d: Date) => string,
): Array<{
  period: string;
  newCustomerInvestment: number;
  returningCustomerInvestment: number;
  inflowInvestment: number;
  rolloverInvestment: number;
  shortTermInvestment: number;
  midShortTermInvestment: number;
  mediumTermInvestment: number;
  longTermInvestment: number;
  uniqueCustomers: number;
}> {
  type Bucket = {
    newCustomerInvestment: number;
    returningCustomerInvestment: number;
    inflowInvestment: number;
    rolloverInvestment: number;
    shortTermInvestment: number;
    midShortTermInvestment: number;
    mediumTermInvestment: number;
    longTermInvestment: number;
    newCustomers: Set<string>;
    returningCustomers: Set<string>;
  };

  const buckets = new Map<string, Bucket>();

  for (const record of investments) {
    const d = new Date(record.mobilisationDate);
    if (Number.isNaN(d.getTime())) continue;
    const key = keyFn(d);
    const amount = Number(record.investmentAmount);

    if (!buckets.has(key)) {
      buckets.set(key, {
        newCustomerInvestment: 0,
        returningCustomerInvestment: 0,
        inflowInvestment: 0,
        rolloverInvestment: 0,
        shortTermInvestment: 0,
        midShortTermInvestment: 0,
        mediumTermInvestment: 0,
        longTermInvestment: 0,
        newCustomers: new Set(),
        returningCustomers: new Set(),
      });
    }

    const bucket = buckets.get(key)!;
    if (record.customerType === 'new') {
      bucket.newCustomers.add(record.customerId);
      bucket.newCustomerInvestment += amount;
    } else {
      bucket.returningCustomers.add(record.customerId);
      bucket.returningCustomerInvestment += amount;
    }
    if (record.fundType === 'inflow') bucket.inflowInvestment += amount;
    else bucket.rolloverInvestment += amount;
    if (record.tenorCategory === 'short_term') bucket.shortTermInvestment += amount;
    else if (record.tenorCategory === 'mid_short_term') bucket.midShortTermInvestment += amount;
    else if (record.tenorCategory === 'medium_term') bucket.mediumTermInvestment += amount;
    else if (record.tenorCategory === 'long_term') bucket.longTermInvestment += amount;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, bucket]) => ({
      period,
      newCustomerInvestment: bucket.newCustomerInvestment,
      returningCustomerInvestment: bucket.returningCustomerInvestment,
      inflowInvestment: bucket.inflowInvestment,
      rolloverInvestment: bucket.rolloverInvestment,
      shortTermInvestment: bucket.shortTermInvestment,
      midShortTermInvestment: bucket.midShortTermInvestment,
      mediumTermInvestment: bucket.mediumTermInvestment,
      longTermInvestment: bucket.longTermInvestment,
      newCustomerCount: bucket.newCustomers.size,
      returningCustomerCount: bucket.returningCustomers.size,
      uniqueCustomers: bucket.newCustomers.size + bucket.returningCustomers.size,
    }));
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsInvestmentRepository: MysqlAnalyticsInvestmentRepository) {}

  async summary(filter?: { from?: string; to?: string }): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid(filter);
    const totalInvestment = investments.reduce((sum, r) => sum + Number(r.investmentAmount), 0);
    const investmentCount = investments.length;
    const customerIds = new Set(investments.map((r) => r.customerId));
    const uniqueCustomers = customerIds.size;

    const newCustomerRecords = investments.filter((r) => r.customerType === 'new');
    const returningCustomerRecords = investments.filter((r) => r.customerType === 'returning');
    const inflowRecords = investments.filter((r) => r.fundType === 'inflow');
    const rolloverRecords = investments.filter((r) => r.fundType === 'rollover');

    const inflowValue = inflowRecords.reduce((s, r) => s + Number(r.investmentAmount), 0);
    const rolloverValue = rolloverRecords.reduce((s, r) => s + Number(r.investmentAmount), 0);

    const tenorCategories = ['short_term', 'mid_short_term', 'medium_term', 'long_term', 'unclassified'];
    const tenorBreakdown = tenorCategories.map((cat) => {
      const matching = investments.filter((r) => r.tenorCategory === cat);
      return {
        tenorCategory: cat,
        label: tenorCategoryLabel(cat),
        investmentValue: matching.reduce((s, r) => s + Number(r.investmentAmount), 0),
        investmentCount: matching.length,
      };
    }).filter((b) => b.investmentCount > 0);

    const highestRecord = investments.reduce<InvestmentRecordRow | null>((best, r) => {
      if (!best || Number(r.investmentAmount) > Number(best.investmentAmount)) return r;
      return best;
    }, null);

    const costOfFundsRecords = investments.filter((r) => r.costOfFunds !== null);
    const averageCostOfFunds =
      costOfFundsRecords.length > 0
        ? costOfFundsRecords.reduce((s, r) => s + Number(r.costOfFunds), 0) / costOfFundsRecords.length
        : null;

    return {
      totalInvestment,
      uniqueCustomers,
      investmentCount,
      averageInvestmentPerRecord: investmentCount > 0 ? totalInvestment / investmentCount : 0,
      averageInvestmentPerCustomer: uniqueCustomers > 0 ? totalInvestment / uniqueCustomers : 0,
      newCustomers: {
        customerCount: new Set(newCustomerRecords.map((r) => r.customerId)).size,
        investmentValue: newCustomerRecords.reduce((s, r) => s + Number(r.investmentAmount), 0),
      },
      returningCustomers: {
        customerCount: new Set(returningCustomerRecords.map((r) => r.customerId)).size,
        investmentValue: returningCustomerRecords.reduce((s, r) => s + Number(r.investmentAmount), 0),
      },
      inflowFunds: {
        investmentCount: inflowRecords.length,
        investmentValue: inflowValue,
      },
      rolloverFunds: {
        investmentCount: rolloverRecords.length,
        investmentValue: rolloverValue,
      },
      fundTypeSplit: {
        inflowShare: totalInvestment > 0 ? (inflowValue / totalInvestment) * 100 : 0,
        rolloverShare: totalInvestment > 0 ? (rolloverValue / totalInvestment) * 100 : 0,
      },
      tenorBreakdown,
      highestContribution: highestRecord
        ? {
            customerId: highestRecord.customerId,
            customerName: highestRecord.customerName,
            investmentAmount: Number(highestRecord.investmentAmount),
            mobilisationDate: highestRecord.mobilisationDate,
          }
        : null,
      averageCostOfFunds,
    };
  }

  async trends(): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();

    return {
      daily: buildSeriesPoints(investments, (d) => d.toISOString().slice(0, 10)),
      weekly: buildSeriesPoints(investments, isoWeek),
      monthly: buildSeriesPoints(investments, isoMonth),
      quarterly: buildSeriesPoints(investments, isoQuarter),
      yearly: buildSeriesPoints(investments, isoYear),
      trendBreakdown: {
        daily: buildBreakdownPoints(investments, (d) => d.toISOString().slice(0, 10)),
        weekly: buildBreakdownPoints(investments, isoWeek),
        monthly: buildBreakdownPoints(investments, isoMonth),
      },
    };
  }

  async customerPortfolio(): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();
    const totalInvestmentAll = investments.reduce((s, r) => s + Number(r.investmentAmount), 0);

    type CustomerAcc = {
      customerName: string;
      customerType: 'new' | 'returning';
      totalInvestment: number;
      investmentCount: number;
      inflowValue: number;
      rolloverValue: number;
      lastRecord: InvestmentRecordRow | null;
      tenorExposure: Record<string, number>;
    };

    const byCustomer = new Map<string, CustomerAcc>();

    for (const record of investments) {
      const amount = Number(record.investmentAmount);
      const existing = byCustomer.get(record.customerId) ?? {
        customerName: record.customerName,
        customerType: record.customerType,
        totalInvestment: 0,
        investmentCount: 0,
        inflowValue: 0,
        rolloverValue: 0,
        lastRecord: null as InvestmentRecordRow | null,
        tenorExposure: {} as Record<string, number>,
      };

      existing.totalInvestment += amount;
      existing.investmentCount += 1;
      if (record.fundType === 'inflow') existing.inflowValue += amount;
      else existing.rolloverValue += amount;

      existing.tenorExposure[record.tenorCategory] = (existing.tenorExposure[record.tenorCategory] ?? 0) + amount;

      if (
        !existing.lastRecord ||
        new Date(record.mobilisationDate) > new Date(existing.lastRecord.mobilisationDate)
      ) {
        existing.lastRecord = record;
      }

      byCustomer.set(record.customerId, existing);
    }

    const items = Array.from(byCustomer.entries())
      .sort(([, a], [, b]) => b.totalInvestment - a.totalInvestment)
      .map(([customerId, acc]) => ({
        customerId,
        customerName: acc.customerName,
        customerType: acc.customerType,
        totalInvestment: acc.totalInvestment,
        investmentCount: acc.investmentCount,
        inflowValue: acc.inflowValue,
        rolloverValue: acc.rolloverValue,
        lastInvestmentAmount: acc.lastRecord ? Number(acc.lastRecord.investmentAmount) : 0,
        lastInvestmentDate: acc.lastRecord?.mobilisationDate ?? '',
        contributionPercentage: totalInvestmentAll > 0 ? (acc.totalInvestment / totalInvestmentAll) * 100 : 0,
        tenorExposure: acc.tenorExposure,
      }));

    return { items };
  }

  async customerPortfolioDetail(customerId: string): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();
    const items = investments.filter((record) => record.customerId === customerId);
    return { customerId, items };
  }

  async wealthManagers(): Promise<object> {
    const investments = await this.analyticsInvestmentRepository.listConfirmedValid();

    type ManagerAcc = {
      investmentAccountCount: number;
      totalInvestment: number;
      customers: Map<string, 'new' | 'returning'>;
      inflowValue: number;
      rolloverValue: number;
      costOfFundsSum: number;
      costOfFundsCount: number;
      fundsAging: FundsAgingBuckets;
      topCustomersMap: Map<string, { customerName: string; totalInvestment: number }>;
    };

    const byManager = new Map<string, ManagerAcc>();

    for (const record of investments) {
      const manager = record.relationshipManager ?? 'Unassigned';
      const amount = Number(record.investmentAmount);

      if (!byManager.has(manager)) {
        byManager.set(manager, {
          investmentAccountCount: 0,
          totalInvestment: 0,
          customers: new Map(),
          inflowValue: 0,
          rolloverValue: 0,
          costOfFundsSum: 0,
          costOfFundsCount: 0,
          fundsAging: emptyAgingBuckets(),
          topCustomersMap: new Map(),
        });
      }

      const acc = byManager.get(manager)!;
      acc.investmentAccountCount += 1;
      acc.totalInvestment += amount;
      acc.customers.set(record.customerId, record.customerType);
      if (record.fundType === 'inflow') acc.inflowValue += amount;
      else acc.rolloverValue += amount;
      if (record.costOfFunds !== null) {
        acc.costOfFundsSum += Number(record.costOfFunds);
        acc.costOfFundsCount += 1;
      }
      accumulateAgingBucket(acc.fundsAging, record);

      const existing = acc.topCustomersMap.get(record.customerId);
      acc.topCustomersMap.set(record.customerId, {
        customerName: record.customerName,
        totalInvestment: (existing?.totalInvestment ?? 0) + amount,
      });
    }

    const globalFundsAging = emptyAgingBuckets();
    for (const record of investments) accumulateAgingBucket(globalFundsAging, record);

    const allCustomers = new Set(investments.map((r) => r.customerId));
    const allNewCustomers = investments.filter((r) => r.customerType === 'new');
    const allReturningCustomers = investments.filter((r) => r.customerType === 'returning');

    const items = Array.from(byManager.entries())
      .sort(([, a], [, b]) => b.totalInvestment - a.totalInvestment)
      .map(([relationshipManager, acc]) => {
        const customerEntries = Array.from(acc.customers.entries());
        const newCustomers = customerEntries.filter(([, type]) => type === 'new');
        const returningCustomers = customerEntries.filter(([, type]) => type === 'returning');

        const newCustomerIds = new Set(newCustomers.map(([id]) => id));
        const returningCustomerIds = new Set(returningCustomers.map(([id]) => id));

        const newCustomerInvestmentValue = investments
          .filter((r) => (r.relationshipManager ?? 'Unassigned') === relationshipManager && newCustomerIds.has(r.customerId))
          .reduce((s, r) => s + Number(r.investmentAmount), 0);

        const returningCustomerInvestmentValue = investments
          .filter((r) => (r.relationshipManager ?? 'Unassigned') === relationshipManager && returningCustomerIds.has(r.customerId))
          .reduce((s, r) => s + Number(r.investmentAmount), 0);

        const topCustomers = Array.from(acc.topCustomersMap.entries())
          .sort(([, a], [, b]) => b.totalInvestment - a.totalInvestment)
          .slice(0, 5)
          .map(([customerId, v]) => ({ customerId, customerName: v.customerName, totalInvestment: v.totalInvestment }));

        return {
          relationshipManager,
          investmentAccountCount: acc.investmentAccountCount,
          totalAum: acc.totalInvestment,
          totalInvestment: acc.totalInvestment,
          customerCount: acc.customers.size,
          ntbMetrics: {
            customerCount: newCustomers.length,
            volume: newCustomerInvestmentValue,
          },
          newCustomerMobilisation: {
            customerCount: newCustomers.length,
            investmentValue: newCustomerInvestmentValue,
          },
          returningCustomerMetrics: {
            customerCount: returningCustomers.length,
            volume: returningCustomerInvestmentValue,
          },
          returningCustomerMobilisation: {
            customerCount: returningCustomers.length,
            investmentValue: returningCustomerInvestmentValue,
          },
          inflowValue: acc.inflowValue,
          rolloverValue: acc.rolloverValue,
          averageInvestmentPerCustomer: acc.customers.size > 0 ? acc.totalInvestment / acc.customers.size : 0,
          fundsAging: acc.fundsAging,
          topCustomers,
        };
      });

    return {
      summary: {
        managerCount: byManager.size,
        investmentAccountCount: investments.length,
        totalAum: investments.reduce((s, r) => s + Number(r.investmentAmount), 0),
        ntbCustomerCount: new Set(allNewCustomers.map((r) => r.customerId)).size,
        ntbVolume: allNewCustomers.reduce((s, r) => s + Number(r.investmentAmount), 0),
        returningCustomerCount: new Set(allReturningCustomers.map((r) => r.customerId)).size,
        returningCustomerVolume: allReturningCustomers.reduce((s, r) => s + Number(r.investmentAmount), 0),
        fundsAging: globalFundsAging,
      },
      items,
    };
  }
}
