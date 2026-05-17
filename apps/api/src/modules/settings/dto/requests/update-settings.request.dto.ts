import { IsArray, IsObject, IsOptional } from 'class-validator';

export class UpdateSettingsRequestDto {
  @IsOptional()
  @IsObject()
  systemSetting?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  tenorBands?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  sourceChannels?: Record<string, unknown>[];
}
