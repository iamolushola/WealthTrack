import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { InvestmentsService } from './investments.service';

@UseGuards(PermissionGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @RequirePermissions('dashboard.customer_portfolio.read')
  @Get(':customerId')
  async customerHistory(@Param('customerId') customerId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.investmentsService.customerHistory(customerId, actor);
  }
}
