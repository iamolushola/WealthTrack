import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AuditService } from './audit.service';

@UseGuards(PermissionGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @RequirePermissions('audit.logs.read')
  @Get()
  async list(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.auditService.list(actor);
  }

  @RequirePermissions('audit.logs.read')
  @Get('export')
  async export(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.auditService.export(actor);
  }
}
