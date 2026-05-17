import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { SyncService } from './sync.service';

@UseGuards(PermissionGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @RequirePermissions('integrations.logs.read')
  @Get('batches/:id')
  async getBatch(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.syncService.getBatch(id, actor);
  }
}
