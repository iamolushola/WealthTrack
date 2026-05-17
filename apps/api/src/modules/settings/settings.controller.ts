import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { UpdateSettingsRequestDto } from './dto/requests/update-settings.request.dto';
import { SettingsService } from './settings.service';

@UseGuards(PermissionGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @RequirePermissions('settings.update')
  @Get()
  async list(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.settingsService.list(actor);
  }

  @RequirePermissions('settings.update')
  @Patch()
  update(
    @Body() payload: UpdateSettingsRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.settingsService.update(payload, actor);
  }
}
