import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { UsersPolicy } from './policies/users.policy';
import { CreateUserRequestDto } from './dto/requests/create-user.request.dto';
import { UpdateUserRequestDto } from './dto/requests/update-user.request.dto';
import { UpdateUserPasswordRequestDto } from './dto/requests/update-user-password.request.dto';
import { UpdateUserStatusRequestDto } from './dto/requests/update-user-status.request.dto';
import { MysqlUserRepository } from './repositories/mysql-user.repository';
import { MysqlRoleRepository } from '../rbac/repositories/mysql-rbac.repositories';
import { createId, nowIso } from '../../common/utils/ids';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { UserRow } from '@wealthtrack/shared-types';

function sanitizeUser(user: UserRow): Omit<UserRow, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersPolicy: UsersPolicy,
    private readonly usersRepository: MysqlUserRepository,
    private readonly roleRepository: MysqlRoleRepository,
  ) {}

  async list(actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanRead(actor);
    const [items, roles] = await Promise.all([this.usersRepository.list(), this.roleRepository.list()]);
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    return {
      items: items.map((user) => ({
        ...sanitizeUser(user),
        roleCode: roleMap.get(user.roleId)?.code ?? null,
        roleName: roleMap.get(user.roleId)?.name ?? null,
      })),
      count: items.length,
    };
  }

  async getById(id: string, actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanRead(actor);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return sanitizeUser(user);
  }

  async create(payload: CreateUserRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanManage(actor, 'users.create');
    const existingUser = await this.usersRepository.findByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const role = await this.roleRepository.findByCode(payload.roleCode);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const now = nowIso();
    const user: UserRow = {
      id: createId(),
      name: payload.name,
      email: payload.email,
      passwordHash: hashPassword(payload.password),
      roleId: role.id,
      status: 'active',
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: actor.actorId,
      updatedBy: actor.actorId,
    };

    await this.usersRepository.create(user);
    return sanitizeUser(user);
  }

  async update(id: string, payload: UpdateUserRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanManage(actor, 'users.update');
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (payload.email && payload.email !== user.email) {
      const existingUser = await this.usersRepository.findByEmail(payload.email);
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    let roleId = user.roleId;
    if (payload.roleCode) {
      const role = await this.roleRepository.findByCode(payload.roleCode);
      if (!role) throw new NotFoundException('Role not found');
      roleId = role.id;
    }

    const updatedUser: UserRow = {
      ...user,
      name: payload.name ?? user.name,
      email: payload.email ?? user.email,
      roleId,
      updatedAt: nowIso(),
      updatedBy: actor.actorId,
    };

    await this.usersRepository.update(updatedUser);
    return sanitizeUser(updatedUser);
  }

  async updatePassword(id: string, payload: UpdateUserPasswordRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanManage(actor, 'users.update');
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Admin resetting another user's password — no current-password check
    // Self-service path goes through updateMyPassword instead
    const updatedUser: UserRow = {
      ...user,
      passwordHash: hashPassword(payload.newPassword),
      updatedAt: nowIso(),
      updatedBy: actor.actorId,
    };

    await this.usersRepository.update(updatedUser);
    return { id: user.id, message: 'Password updated successfully' };
  }

  async updateMyPassword(payload: UpdateUserPasswordRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanManage(actor, 'users.update');
    const user = await this.usersRepository.findById(actor.actorId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!verifyPassword(payload.currentPassword, user.passwordHash)) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const updatedUser: UserRow = {
      ...user,
      passwordHash: hashPassword(payload.newPassword),
      updatedAt: nowIso(),
      updatedBy: actor.actorId,
    };

    await this.usersRepository.update(updatedUser);
    return { id: user.id, message: 'Password updated successfully' };
  }

  async getMe(actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanRead(actor);
    const user = await this.usersRepository.findById(actor.actorId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return sanitizeUser(user);
  }

  async updateMe(payload: UpdateUserRequestDto, actor: AuthenticatedActor): Promise<object> {
    return this.update(actor.actorId, payload, actor);
  }

  async changeStatus(id: string, payload: UpdateUserStatusRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanManage(actor, 'users.deactivate');
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser: UserRow = {
      ...user,
      status: payload.status,
      updatedAt: nowIso(),
      updatedBy: actor.actorId,
    };

    await this.usersRepository.update(updatedUser);
    return sanitizeUser(updatedUser);
  }

  async bulkSoftDelete(ids: string[], actor: AuthenticatedActor): Promise<object> {
    this.usersPolicy.assertCanManage(actor, 'users.deactivate');
    if (actor?.actorType !== 'admin') {
      throw new Error('Admin role is required to bulk-delete users');
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return { deleted: 0, message: 'No IDs provided' };
    }
    // Prevent deleting own account
    const safeIds = ids.filter((id) => id !== actor.actorId);
    const deleted = await this.usersRepository.softDeleteByIds(safeIds, nowIso());
    return { deleted, message: `${deleted} user${deleted !== 1 ? 's' : ''} removed` };
  }
}
