import { Injectable } from '@nestjs/common';
import { SourceChannelRow, SystemSettingRow, TenorBandRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { SettingsTenorBandRepository, SourceChannelRepository, SystemSettingRepository } from '../interfaces/settings.repositories';

@Injectable()
export class MysqlSystemSettingRepository implements SystemSettingRepository {
  constructor(private readonly mysql: MysqlService) {}

  findByKey(settingKey: string): Promise<SystemSettingRow | null> {
    return this.mysql.selectOne<SystemSettingRow>('SELECT * FROM system_settings WHERE setting_key = ? LIMIT 1', [settingKey]);
  }

  list(): Promise<SystemSettingRow[]> {
    return this.mysql.selectMany<SystemSettingRow>('SELECT * FROM system_settings ORDER BY setting_key ASC');
  }

  async upsert(setting: SystemSettingRow): Promise<void> {
    await this.mysql.execute(
      'INSERT INTO system_settings SET ? ON DUPLICATE KEY UPDATE setting_value_json = VALUES(setting_value_json), description = VALUES(description), updated_by = VALUES(updated_by)',
      [setting],
    );
  }
}

@Injectable()
export class MysqlSettingsTenorBandRepository implements SettingsTenorBandRepository {
  constructor(private readonly mysql: MysqlService) {}

  list(): Promise<TenorBandRow[]> {
    return this.mysql.selectMany<TenorBandRow>('SELECT * FROM tenor_bands ORDER BY display_order ASC');
  }

  async replaceAll(rows: TenorBandRow[]): Promise<void> {
    await this.mysql.execute('DELETE FROM tenor_bands');
    await Promise.all(rows.map((row) => this.mysql.execute('INSERT INTO tenor_bands SET ?', [row])));
  }
}

@Injectable()
export class MysqlSourceChannelRepository implements SourceChannelRepository {
  constructor(private readonly mysql: MysqlService) {}

  list(): Promise<SourceChannelRow[]> {
    return this.mysql.selectMany<SourceChannelRow>('SELECT * FROM source_channels ORDER BY code ASC');
  }

  async replaceAll(rows: SourceChannelRow[]): Promise<void> {
    await this.mysql.execute('DELETE FROM source_channels');
    await Promise.all(rows.map((row) => this.mysql.execute('INSERT INTO source_channels SET ?', [row])));
  }
}
