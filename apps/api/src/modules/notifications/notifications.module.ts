import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MysqlNotificationOutboxRepository } from './repositories/mysql-notification-outbox.repository';

@Module({
  providers: [NotificationsService, MysqlNotificationOutboxRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
