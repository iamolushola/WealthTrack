import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  MysqlAuthSessionRepository,
  MysqlLoginAttemptRepository,
  MysqlPasswordResetTokenRepository,
} from './repositories/mysql-auth.repositories';
import { MysqlUserRepository } from '../users/repositories/mysql-user.repository';
import { MysqlPermissionRepository, MysqlRolePermissionRepository, MysqlRoleRepository } from '../rbac/repositories/mysql-rbac.repositories';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    MysqlAuthSessionRepository,
    MysqlPasswordResetTokenRepository,
    MysqlLoginAttemptRepository,
    MysqlUserRepository,
    MysqlRoleRepository,
    MysqlPermissionRepository,
    MysqlRolePermissionRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
