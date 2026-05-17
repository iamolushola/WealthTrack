import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersPolicy } from './policies/users.policy';
import { MysqlUserRepository } from './repositories/mysql-user.repository';
import { MysqlRoleRepository } from '../rbac/repositories/mysql-rbac.repositories';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersPolicy, MysqlUserRepository, MysqlRoleRepository],
  exports: [UsersService],
})
export class UsersModule {}
