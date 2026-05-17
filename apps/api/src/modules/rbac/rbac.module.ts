import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { MysqlPermissionRepository, MysqlRolePermissionRepository, MysqlRoleRepository } from './repositories/mysql-rbac.repositories';

@Module({
  controllers: [RbacController],
  providers: [RbacService, MysqlRoleRepository, MysqlPermissionRepository, MysqlRolePermissionRepository],
  exports: [RbacService],
})
export class RbacModule {}
