import { Global, Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MysqlService } from './mysql.service';

@Global()
@Module({
  providers: [MysqlService, MigrationService],
  exports: [MysqlService],
})
export class MysqlModule {}
