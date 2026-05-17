import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { MysqlOutboxEventRepository } from './repositories/mysql-outbox-event.repository';

@Module({
  providers: [OutboxService, MysqlOutboxEventRepository],
  exports: [OutboxService],
})
export class OutboxModule {}
