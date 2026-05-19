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
  async trends(): Promise<object> {
    return this.analyticsService.trends();
  }

  @RequirePermissions('dashboard.customer_portfolio.read')
  @Get('customer-portfolio')
  async customerPortfolio(): Promise<object> {
    return this.analyticsService.customerPortfolio();
  }

  @RequirePermissions('dashboard.customer_portfolio.read')
  @Get('customer-portfolio/:customerId')
  async customerPortfolioDetail(@Param('customerId') customerId: string): Promise<object> {
    return this.analyticsService.customerPortfolioDetail(customerId);
  }

  @RequirePermissions('dashboard.wealth_manager.read')
  @Get('wealth-managers')
  async wealthManagers(): Promise<object> {
    return this.analyticsService.wealthManagers();
  }
}
