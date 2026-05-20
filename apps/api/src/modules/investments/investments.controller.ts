import { Body, Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { InvestmentsService } from './investments.service';

@UseGuards(PermissionGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @RequirePermissions('dashboard.summary.read')
  @Get()
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<object> {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(10, Number(pageSize) || 50));
    return this.investmentsService.list(actor, p, ps);
  }

  @RequirePermissions('dashboard.summary.read')
  @Delete()
  async bulkDelete(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() body: { ids: string[] },
  ): Promise<object> {
    return this.investmentsService.bulkDeleteByIds(body?.ids ?? [], actor);
  }

  @RequirePermissions('dashboard.customer_portfolio.read')
  @Delete('customers')
  async bulkDeleteCustomers(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() body: { customerIds: string[] },
  ): Promise<object> {
    return this.investmentsService.bulkDeleteByCustomerIds(body?.customerIds ?? [], actor);
  }

  @RequirePermissions('dashboard.customer_portfolio.read')
  @Get(':customerId')
  async customerHistory(@Param('customerId') customerId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.investmentsService.customerHistory(customerId, actor);
  }
}
