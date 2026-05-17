import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginRequestDto } from './dto/requests/login.request.dto';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { MysqlUserRepository } from '../users/repositories/mysql-user.repository';
import {
  MysqlAuthSessionRepository,
  MysqlLoginAttemptRepository,
} from './repositories/mysql-auth.repositories';
import { MysqlPermissionRepository, MysqlRolePermissionRepository, MysqlRoleRepository } from '../rbac/repositories/mysql-rbac.repositories';
import { createId, nowIso } from '../../common/utils/ids';
import { verifyPassword } from '../../common/utils/password';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: MysqlUserRepository,
    private readonly authSessionRepository: MysqlAuthSessionRepository,
    private readonly loginAttemptRepository: MysqlLoginAttemptRepository,
    private readonly roleRepository: MysqlRoleRepository,
    private readonly rolePermissionRepository: MysqlRolePermissionRepository,
    private readonly permissionRepository: MysqlPermissionRepository,
  ) {}

  async login(payload: LoginRequestDto): Promise<object> {
    const user = await this.usersRepository.findByEmail(payload.email);
    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      await this.loginAttemptRepository.append({
        id: createId(),
        email: payload.email,
        userId: user?.id ?? null,
        outcome: 'failed',
        failureReason: 'invalid_credentials',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        attemptedAt: nowIso(),
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const role = await this.roleRepository.findByCode(user.roleId);
    const rolePermissions = await this.rolePermissionRepository.listByRoleId(user.roleId);
    const permissions = rolePermissions.length
      ? await this.permissionRepository.findByCodes([])
      : [];
    const resolvedPermissions = permissions.length
      ? permissions.map((permission) => permission.code)
      : (
          await Promise.all(
            rolePermissions.map(async (entry) => {
              const found = await this.permissionRepository.list();
              return found.find((permission) => permission.id === entry.permissionId)?.code;
            }),
          )
        ).filter((permission): permission is string => Boolean(permission));

    const sessionId = createId();
    const refreshToken = createId();
    await this.authSessionRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: refreshToken,
      status: 'active',
      ipAddress: null,
      userAgent: null,
      lastSeenAt: nowIso(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      createdAt: nowIso(),
      revokedAt: null,
    });

    await this.loginAttemptRepository.append({
      id: createId(),
      email: payload.email,
      userId: user.id,
      outcome: 'success',
      failureReason: null,
      ipAddress: null,
      userAgent: null,
      correlationId: null,
      attemptedAt: nowIso(),
    });

    return {
      sessionId,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        roleCode: role?.code ?? user.roleId,
        permissions: resolvedPermissions,
      },
    };
  }

  async logout(actor: AuthenticatedActor): Promise<object> {
    if (actor.sessionId) {
      await this.authSessionRepository.revokeById(actor.sessionId, nowIso());
    }

    return { success: true, actorId: actor.actorId, revokedSessionId: actor.sessionId ?? null };
  }

  async refresh(actor: AuthenticatedActor): Promise<object> {
    return {
      tokenType: 'refresh',
      refreshedAt: nowIso(),
      actor,
    };
  }

  async getCurrentActor(actor: AuthenticatedActor): Promise<AuthenticatedActor> {
    return actor;
  }
}
