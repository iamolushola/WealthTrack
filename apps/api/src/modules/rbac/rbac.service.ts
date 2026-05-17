import { Injectable } from '@nestjs/common';
import { MysqlPermissionRepository, MysqlRoleRepository } from './repositories/mysql-rbac.repositories';

@Injectable()
export class RbacService {
  constructor(
    private readonly roleRepository: MysqlRoleRepository,
    private readonly permissionRepository: MysqlPermissionRepository,
  ) {}

  async roles(): Promise<object> {
    const items = await this.roleRepository.list();
    return { items, count: items.length };
  }

  async permissions(): Promise<object> {
    const items = await this.permissionRepository.list();
    return { items, count: items.length };
  }
}
