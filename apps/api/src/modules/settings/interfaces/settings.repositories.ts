import { SourceChannelRow, SystemSettingRow, TenorBandRow } from '@wealthtrack/shared-types';

export interface SystemSettingRepository {
  findByKey(settingKey: string): Promise<SystemSettingRow | null>;
  list(): Promise<SystemSettingRow[]>;
  upsert(setting: SystemSettingRow): Promise<void>;
}

export interface SettingsTenorBandRepository {
  list(): Promise<TenorBandRow[]>;
  replaceAll(rows: TenorBandRow[]): Promise<void>;
}

export interface SourceChannelRepository {
  list(): Promise<SourceChannelRow[]>;
  replaceAll(rows: SourceChannelRow[]): Promise<void>;
}
