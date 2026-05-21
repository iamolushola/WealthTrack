import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersPolicy } from './policies/users.policy';
import { MysqlUserRepository } from './repositories/mysql-user.repository';
import { MysqlRoleRepository } from '../rbac/repositories/mysql-rbac.repositories';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UsersPolicy, MysqlUserRepository, MysqlRoleRepository],
  exports: [UsersService],
})
export class UsersModule {}
