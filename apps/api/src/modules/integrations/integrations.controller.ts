import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateIntegrationRequestDto } from './dto/requests/create-integration.request.dto';
import { UpdateIntegrationRequestDto } from './dto/requests/update-integration.request.dto';
import { UpdateSheetTabRequestDto } from './dto/requests/update-sheet-tab.request.dto';
import { IntegrationsService } from './integrations.service';

@UseGuards(PermissionGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @RequirePermissions('integrations.read')
  @Get()
  async list(): Promise<object> {
    return this.integrationsService.list();
  }

  @RequirePermissions('integrations.create')
  @Post()
  create(
    @Body() payload: CreateIntegrationRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.integrationsService.create(payload, actor);
  }

  @RequirePermissions('integrations.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateIntegrationRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.integrationsService.update(id, payload, actor);
  }

  @RequirePermissions('integrations.delete')
  @Delete(':id')
  disable(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.integrationsService.disable(id, actor);
  }

  @RequirePermissions('integrations.create')
  @Post(':id/test')
  testConnection(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.integrationsService.testConnection(id, actor);
  }

  @RequirePermissions('integrations.sync.trigger')
  @Post(':id/sync')
  triggerSync(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.integrationsService.triggerSync(id, actor);
  }

  @RequirePermissions('integrations.logs.read')
  @Get(':id/sync-logs')
  syncLogs(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.integrationsService.syncLogs(id, actor);
  }

  // ── Google Sheets-specific endpoints ─────────────────────────────────────

  @RequirePermissions('integrations.create')
  @Post(':id/discover-tabs')
  discoverTabs(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.integrationsService.discoverSheetTabs(id, actor);
  }

  @RequirePermissions('integrations.read')
  @Get(':id/tabs')
  listTabs(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.integrationsService.listSheetTabs(id, actor);
  }

  @RequirePermissions('integrations.update')
  @Patch(':id/tabs/:tabId')
  updateTab(
    @Param('id') id: string,
    @Param('tabId') tabId: string,
    @Body() payload: UpdateSheetTabRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.integrationsService.updateSheetTab(id, tabId, payload, actor);
  }
}
