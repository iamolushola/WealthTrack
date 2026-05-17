import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ValidationService } from './validation.service';

@UseGuards(PermissionGuard)
@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @RequirePermissions('uploads.preview.read')
  @Get('batches/:batchId')
  async batchSummary(@Param('batchId') batchId: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.validationService.batchSummary(batchId, actor);
  }
}
