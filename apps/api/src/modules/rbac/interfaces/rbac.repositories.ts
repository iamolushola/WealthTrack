import { PermissionRow, RolePermissionRow, RoleRow } from '@wealthtrack/shared-types';

export interface RoleRepository {
  list(): Promise<RoleRow[]>;
  findById(id: string): Promise<RoleRow | null>;
  findByCode(code: string): Promise<RoleRow | null>;
  create(role: RoleRow): Promise<void>;
  update(role: RoleRow): Promise<void>;
  deleteById(id: string): Promise<void>;
  countUsersByRoleId(roleId: string): Promise<number>;
}

export interface PermissionRepository {
  list(): Promise<PermissionRow[]>;
  findByCodes(codes: string[]): Promise<PermissionRow[]>;
  findByIds(ids: string[]): Promise<PermissionRow[]>;
}

export interface RolePermissionRepository {
  listByRoleId(roleId: string): Promise<RolePermissionRow[]>;
  replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<void>;
}
