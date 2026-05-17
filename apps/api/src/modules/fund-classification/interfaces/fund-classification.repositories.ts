import { SystemSettingRow } from '@wealthtrack/shared-types';

export interface FundClassificationSettingsRepository {
  findByKey(settingKey: string): Promise<SystemSettingRow | null>;
}
