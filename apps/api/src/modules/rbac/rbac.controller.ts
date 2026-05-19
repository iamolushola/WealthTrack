import { Controller, Get } from '@nestjs/common';
import { RbacService } from './rbac.service';

@Controller()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  async roles(): Promise<object> {
    return this.rbacService.roles();
  }

  @Get('permissions')
  async permissions(): Promise<object> {
    return this.rbacService.permissions();
  }

  @Get('role-permissions')
  async rolePermissions(): Promise<object> {
    return this.rbacService.rolePermissionsMatrix();
  }
}
