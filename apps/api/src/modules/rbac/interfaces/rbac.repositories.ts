import { PermissionRow, RolePermissionRow, RoleRow } from '@wealthtrack/shared-types';

export interface RoleRepository {
  list(): Promise<RoleRow[]>;
  findById(id: string): Promise<RoleRow | null>;
  findByCode(code: string): Promise<RoleRow | null>;
}

export interface PermissionRepository {
  list(): Promise<PermissionRow[]>;
  findByCodes(codes: string[]): Promise<PermissionRow[]>;
}

export interface RolePermissionRepository {
  listByRoleId(roleId: string): Promise<RolePermissionRow[]>;
  replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<void>;
}
