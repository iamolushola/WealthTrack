import { Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { SettingsPolicy } from './policies/settings.policy';
import { UpdateSettingsRequestDto } from './dto/requests/update-settings.request.dto';
import {
  MysqlSettingsTenorBandRepository,
  MysqlSourceChannelRepository,
  MysqlSystemSettingRepository,
} from './repositories/mysql-settings.repositories';
import { createId, nowIso } from '../../common/utils/ids';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsPolicy: SettingsPolicy,
    private readonly systemSettingRepository: MysqlSystemSettingRepository,
    private readonly tenorBandRepository: MysqlSettingsTenorBandRepository,
    private readonly sourceChannelRepository: MysqlSourceChannelRepository,
  ) {}

  async list(actor: AuthenticatedActor): Promise<object> {
    this.settingsPolicy.assertCanUpdate(actor);
    const [settings, tenorBands, sourceChannels] = await Promise.all([
      this.systemSettingRepository.list(),
      this.tenorBandRepository.list(),
      this.sourceChannelRepository.list(),
    ]);
    return { settings, tenorBands, sourceChannels };
  }

  async update(payload: UpdateSettingsRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.settingsPolicy.assertCanUpdate(actor);
    if (payload.systemSetting) {
      const settingKey = String(payload.systemSetting.settingKey ?? 'default');
      await this.systemSettingRepository.upsert({
        id: createId(),
        settingKey,
        settingValueJson: payload.systemSetting,
        description: String(payload.systemSetting.description ?? 'Updated setting'),
        isSensitive: Boolean(payload.systemSetting.isSensitive ?? false),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: actor.actorId,
        updatedBy: actor.actorId,
      });
    }

    if (payload.tenorBands) {
      await this.tenorBandRepository.replaceAll(
        payload.tenorBands.map((band, index) => ({
          id: String(band.id ?? createId()),
          code: String(band.code ?? `band_${index + 1}`),
          label: String(band.label ?? `Band ${index + 1}`),
          minDays: Number(band.minDays ?? 0),
          maxDays: Number(band.maxDays ?? 0),
          displayOrder: Number(band.displayOrder ?? index + 1),
          status: (band.status as 'active' | 'inactive') ?? 'active',
          createdAt: nowIso(),
          updatedAt: nowIso(),
          createdBy: actor.actorId,
          updatedBy: actor.actorId,
        })),
      );
    }

    if (payload.sourceChannels) {
      await this.sourceChannelRepository.replaceAll(
        payload.sourceChannels.map((channel, index) => ({
          id: String(channel.id ?? createId()),
          code: String(channel.code ?? `channel_${index + 1}`),
          name: String(channel.name ?? `Channel ${index + 1}`),
          description: channel.description ? String(channel.description) : null,
          status: (channel.status as 'active' | 'inactive') ?? 'active',
          createdAt: nowIso(),
          updatedAt: nowIso(),
          createdBy: actor.actorId,
          updatedBy: actor.actorId,
        })),
      );
    }

    return this.list(actor);
  }
}
