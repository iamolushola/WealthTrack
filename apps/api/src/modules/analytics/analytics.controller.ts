import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(PermissionGuard)
@Controller('dashboard')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @RequirePermissions('dashboard.summary.read')
  @Get('summary')
  async summary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<object> {
    return this.analyticsService.summary({ from, to });
  }

  @RequirePermissions('dashboard.trends.read')
  @Get('trends')
  async trends(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<object> {
    return this.analyticsService.trends({ from, to });
  }

  @RequirePermissions('dashboard.customers.read')
  @Get('customer-portfolio')
  async customerPortfolio(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('customerType') customerType?: string,
  ): Promise<object> {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(10, Number(pageSize) || 25));
    const filter: { q?: string; customerType?: 'new' | 'returning' } = {
      ...(q && { q }),
      ...(customerType === 'new' || customerType === 'returning' ? { customerType } : {}),
    };
    return this.analyticsService.customerPortfolio(p, ps, Object.keys(filter).length > 0 ? filter : undefined);
  }

  @RequirePermissions('dashboard.customers.read')
  @Get('customer-portfolio/:customerId')
  async customerPortfolioDetail(@Param('customerId') customerId: string): Promise<object> {
    return this.analyticsService.customerPortfolioDetail(customerId);
  }

  @RequirePermissions('dashboard.managers.read')
  @Get('wealth-managers')
  async wealthManagers(@Query('q') q?: string): Promise<object> {
    return this.analyticsService.wealthManagers(q ? { q } : undefined);
  }
}
