import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsPolicy } from './policies/settings.policy';
import {
  MysqlSettingsTenorBandRepository,
  MysqlSourceChannelRepository,
  MysqlSystemSettingRepository,
} from './repositories/mysql-settings.repositories';

@Module({
  controllers: [SettingsController],
  providers: [
    SettingsService,
    SettingsPolicy,
    MysqlSystemSettingRepository,
    MysqlSettingsTenorBandRepository,
    MysqlSourceChannelRepository,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
