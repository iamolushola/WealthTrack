import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { ConfirmImportRequestDto } from './dto/requests/confirm-import.request.dto';
import { ImportsService } from './imports.service';

@UseGuards(PermissionGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @RequirePermissions('uploads.import.confirm')
  @Post('confirm')
  async confirm(@Body() payload: ConfirmImportRequestDto, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.importsService.confirm(payload, actor);
  }
}
