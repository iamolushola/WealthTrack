import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { UsersPolicy } from './policies/users.policy';
import { CreateUserRequestDto } from './dto/requests/create-user.request.dto';
import { UpdateUserRequestDto } from './dto/requests/update-user.request.dto';
import { UpdateUserStatusRequestDto } from './dto/requests/update-user-status.request.dto';
import { MysqlUserRepository } from './repositories/mysql-user.repository';
import { MysqlRoleRepository } from '../rbac/repositories/mysql-rbac.repositories';
import { createId, nowIso } from '../../common/utils/ids';
import { hashPassword } from '../../common/utils/password';
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
    const items = await this.usersRepository.list();
    return { items: items.map((user) => sanitizeUser(user)), count: items.length };
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

    const updatedUser: UserRow = {
      ...user,
      name: payload.name ?? user.name,
      email: payload.email ?? user.email,
      updatedAt: nowIso(),
      updatedBy: actor.actorId,
    };

    await this.usersRepository.update(updatedUser);
    return sanitizeUser(updatedUser);
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
}
