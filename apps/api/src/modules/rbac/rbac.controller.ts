import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateRoleRequestDto } from './dto/create-role.request.dto';
import { UpdateRoleRequestDto } from './dto/update-role.request.dto';
import { UpdateRolePermissionsRequestDto } from './dto/update-role-permissions.request.dto';
import { RbacService } from './rbac.service';

@UseGuards(PermissionGuard)
@Controller()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @RequirePermissions('users.read')
  @Get('roles')
  async roles(): Promise<object> {
    return this.rbacService.roles();
  }

  @RequirePermissions('users.read')
  @Get('permissions')
  async permissions(): Promise<object> {
    return this.rbacService.permissions();
  }

  @RequirePermissions('users.read')
  @Get('role-permissions')
  async rolePermissions(): Promise<object> {
    return this.rbacService.rolePermissionsMatrix();
  }

  @RequirePermissions('settings.update')
  @Post('roles')
  async createRole(@Body() payload: CreateRoleRequestDto): Promise<object> {
    return this.rbacService.createRole(payload);
  }

  @RequirePermissions('settings.update')
  @Patch('roles/:id')
  async updateRole(@Param('id') id: string, @Body() payload: UpdateRoleRequestDto): Promise<object> {
    return this.rbacService.updateRole(id, payload);
  }

  @RequirePermissions('settings.update')
  @Put('roles/:id/permissions')
  async updateRolePermissions(@Param('id') id: string, @Body() payload: UpdateRolePermissionsRequestDto): Promise<object> {
    return this.rbacService.updateRolePermissions(id, payload.permissionCodes);
  }

  @RequirePermissions('settings.update')
  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string): Promise<object> {
    return this.rbacService.deleteRole(id);
  }
}
