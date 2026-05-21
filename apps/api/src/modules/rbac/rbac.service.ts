import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleRow } from '@wealthtrack/shared-types';
import { createId, nowIso } from '../../common/utils/ids';
import { MysqlPermissionRepository, MysqlRolePermissionRepository, MysqlRoleRepository } from './repositories/mysql-rbac.repositories';

const SYSTEM_ROLE_CODES = ['super_admin', 'admin', 'analyst', 'uploader', 'ops_manager', 'compliance_officer', 'viewer'] as const;

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
        return Promise.all(
          all.map((r) =>
            this.rolePermissionRepository.listByRoleId(r.id).then((rps) => ({
              roleId: r.id,
              permissionIds: rps.map((rp) => rp.permissionId),
            })),
          ),
        );
      }),
    ]);

    const permMap = new Map(permissions.map((p) => [p.id, p.code]));
    const rolesWithPerms = roles.map((role) => {
      const entry = rolePerms.find((rp) => rp.roleId === role.id);
      return {
        ...role,
        isSystem: SYSTEM_ROLE_CODES.includes(role.code as (typeof SYSTEM_ROLE_CODES)[number]),
        permissionCodes: (entry?.permissionIds ?? []).map((id) => permMap.get(id) ?? id),
      };
    });

    return { roles: rolesWithPerms, permissions };
  }

  async createRole(payload: { name: string; code: string; description?: string }): Promise<object> {
    const existing = await this.roleRepository.findByCode(payload.code);
    if (existing) {
      throw new ConflictException(`Role code "${payload.code}" already exists`);
    }

    const role: RoleRow = {
      id: createId(),
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      createdAt: nowIso(),
    };

    await this.roleRepository.create(role);
    return role;
  }

  async updateRole(id: string, payload: { name?: string; description?: string }): Promise<object> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const updated: RoleRow = {
      ...role,
      name: payload.name ?? role.name,
      description: payload.description !== undefined ? payload.description : role.description,
    };

    await this.roleRepository.update(updated);
    return updated;
  }

  async deleteRole(id: string): Promise<object> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (SYSTEM_ROLE_CODES.includes(role.code as (typeof SYSTEM_ROLE_CODES)[number])) {
      throw new ForbiddenException('System roles cannot be deleted');
    }

    const userCount = await this.roleRepository.countUsersByRoleId(id);
    if (userCount > 0) {
      throw new ConflictException(`${userCount} user(s) are assigned to this role. Reassign them first.`);
    }

    await this.rolePermissionRepository.replaceRolePermissions(id, []);
    await this.roleRepository.deleteById(id);
    return { id, message: 'Role deleted' };
  }

  async updateRolePermissions(roleId: string, permissionCodes: string[]): Promise<object> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.permissionRepository.findByCodes(permissionCodes);
    const permissionIds = permissions.map((p) => p.id);
    await this.rolePermissionRepository.replaceRolePermissions(roleId, permissionIds);

    return {
      roleId,
      roleName: role.name,
      permissionCodes: permissions.map((p) => p.code),
    };
  }
}

