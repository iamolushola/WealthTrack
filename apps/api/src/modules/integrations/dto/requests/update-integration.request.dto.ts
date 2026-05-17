import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateIntegrationRequestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  secretRef?: string;

  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  connectionConfig?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(['manual', 'daily', 'weekly', 'monthly'])
  syncFrequency?: 'manual' | 'daily' | 'weekly' | 'monthly';
}
