import { Injectable } from '@nestjs/common';
import { PermissionRow, RolePermissionRow, RoleRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { PermissionRepository, RolePermissionRepository, RoleRepository } from '../interfaces/rbac.repositories';

@Injectable()
export class MysqlRoleRepository implements RoleRepository {
  constructor(private readonly mysql: MysqlService) {}

  list(): Promise<RoleRow[]> {
    return this.mysql.selectMany<RoleRow>('SELECT * FROM roles ORDER BY code ASC');
  }

  findByCode(code: string): Promise<RoleRow | null> {
    return this.mysql.selectOne<RoleRow>('SELECT * FROM roles WHERE code = ? LIMIT 1', [code]);
  }
}

@Injectable()
export class MysqlPermissionRepository implements PermissionRepository {
  constructor(private readonly mysql: MysqlService) {}

  list(): Promise<PermissionRow[]> {
    return this.mysql.selectMany<PermissionRow>('SELECT * FROM permissions ORDER BY code ASC');
  }

  findByCodes(codes: string[]): Promise<PermissionRow[]> {
    if (codes.length === 0) {
      return Promise.resolve([]);
    }

    const placeholders = codes.map(() => '?').join(', ');
    return this.mysql.selectMany<PermissionRow>(`SELECT * FROM permissions WHERE code IN (${placeholders})`, codes);
  }
}

@Injectable()
export class MysqlRolePermissionRepository implements RolePermissionRepository {
  constructor(private readonly mysql: MysqlService) {}

  listByRoleId(roleId: string): Promise<RolePermissionRow[]> {
    return this.mysql.selectMany<RolePermissionRow>('SELECT * FROM role_permissions WHERE role_id = ?', [roleId]);
  }

  async replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.mysql.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    await Promise.all(
      permissionIds.map((permissionId, index) =>
        this.mysql.execute('INSERT INTO role_permissions (id, role_id, permission_id, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))', [
          `${roleId}-${index}`.slice(0, 36),
          roleId,
          permissionId,
        ]),
      ),
    );
  }
}
