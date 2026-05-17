import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateUserRequestDto } from './dto/requests/create-user.request.dto';
import { UpdateUserRequestDto } from './dto/requests/update-user.request.dto';
import { UpdateUserStatusRequestDto } from './dto/requests/update-user-status.request.dto';
import { UsersService } from './users.service';

@UseGuards(PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions('users.read')
  @Get()
  async list(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.usersService.list(actor);
  }

  @RequirePermissions('users.read')
  @Get(':id')
  async getById(@Param('id') id: string, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.usersService.getById(id, actor);
  }

  @RequirePermissions('users.create')
  @Post()
  async create(@Body() payload: CreateUserRequestDto, @CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.usersService.create(payload, actor);
  }

  @RequirePermissions('users.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateUserRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.usersService.update(id, payload, actor);
  }

  @RequirePermissions('users.deactivate')
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() payload: UpdateUserStatusRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.usersService.changeStatus(id, payload, actor);
  }
}
