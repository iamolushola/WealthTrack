import { Injectable } from '@nestjs/common';
import { SystemSettingRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { FundClassificationSettingsRepository } from '../interfaces/fund-classification.repositories';

@Injectable()
export class MysqlFundClassificationSettingsRepository implements FundClassificationSettingsRepository {
  constructor(private readonly mysql: MysqlService) {}

  findByKey(settingKey: string): Promise<SystemSettingRow | null> {
    return this.mysql.selectOne<SystemSettingRow>('SELECT * FROM system_settings WHERE setting_key = ? LIMIT 1', [settingKey]);
  }
}
