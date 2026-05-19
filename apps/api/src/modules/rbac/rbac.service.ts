import { Injectable } from '@nestjs/common';
import { MysqlPermissionRepository, MysqlRolePermissionRepository, MysqlRoleRepository } from './repositories/mysql-rbac.repositories';

@Injectable()
export class RbacService {
  constructor(
    private readonly roleRepository: MysqlRoleRepository,
    private readonly permissionRepository: MysqlPermissionRepository,
    private readonly rolePermissionRepository: MysqlRolePermissionRepository,
  ) {}

  async roles(): Promise<object> {
    const items = await this.roleRepository.list();
    return { items, count: items.length };
  }

  async permissions(): Promise<object> {
    const items = await this.permissionRepository.list();
    return { items, count: items.length };
  }

  async rolePermissionsMatrix(): Promise<object> {
    const [roles, permissions, rolePerms] = await Promise.all([
      this.roleRepository.list(),
      this.permissionRepository.list(),
      Promise.all([]).then(async () => {
        const all = await this.roleRepository.list();
        return Promise.all(all.map((r) => this.rolePermissionRepository.listByRoleId(r.id).then((rps) => ({ roleId: r.id, permissionIds: rps.map((rp) => rp.permissionId) }))));
      }),
    ]);

    const permMap = new Map(permissions.map((p) => [p.id, p.code]));
    const rolesWithPerms = roles.map((role) => {
      const entry = rolePerms.find((rp) => rp.roleId === role.id);
      return {
        ...role,
        permissionCodes: (entry?.permissionIds ?? []).map((id) => permMap.get(id) ?? id),
      };
    });

    return { roles: rolesWithPerms, permissions };
  }
}
