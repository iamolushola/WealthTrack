import { Body, Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CommissionFilters, InvestmentFilters } from './interfaces/investments.repositories';
import { InvestmentsService } from './investments.service';

@UseGuards(PermissionGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @RequirePermissions('dashboard.commissions.read')
  @Get('commissions')
  async listCommissions(
    @CurrentActor() actor: AuthenticatedActor,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('customerType') customerType?: string,
    @Query('fundType') fundType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<object> {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(10, Number(pageSize) || 50));
    const filters: CommissionFilters = {
      ...(q && { q }),
      ...(customerType === 'new' || customerType === 'returning' ? { customerType } : {}),
      ...(fundType === 'inflow' || fundType === 'rollover' ? { fundType } : {}),
      ...(from && { from }),
      ...(to && { to }),
    };
    return this.investmentsService.listCommissions(actor, p, ps, filters);
  }

  @RequirePermissions('dashboard.investments.read')
  @Get()
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('customerType') customerType?: string,
    @Query('fundType') fundType?: string,
    @Query('importStatus') importStatus?: string,
    @Query('tenorCategory') tenorCategory?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<object> {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(10, Number(pageSize) || 50));
    const filters: InvestmentFilters = {
      ...(q && { q }),
      ...(customerType === 'new' || customerType === 'returning' ? { customerType } : {}),
      ...(fundType === 'inflow' || fundType === 'rollover' ? { fundType } : {}),
      ...(importStatus && { importStatus }),
      ...(tenorCategory && { tenorCategory }),
      ...(from && { from }),
      ...(to && { to }),
    };
    return this.investmentsService.list(actor, p, ps, filters);
  }

  @RequirePermissions('dashboard.investments.read')
  @Delete()
  async bulkDelete(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() body: { ids: string[] },
  ): Promise<object> {
    return this.investmentsService.bulkDeleteByIds(body?.ids ?? [], actor);
  }

  @RequirePermissions('dashboard.customers.read')
  @Delete('customers')
  async bulkDeleteCustomers(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() body: { customerIds: string[] },
  ): Promise<object> {
    return this.investmentsService.bulkDeleteByCustomerIds(body?.customerIds ?? [], actor);
  }

  @RequirePermissions('dashboard.customers.read')
  @Get(':customerId')
  async customerHistory(@Param('customerId') customerId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.investmentsService.customerHistory(customerId, actor);
  }
}
