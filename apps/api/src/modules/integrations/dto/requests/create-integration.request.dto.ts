import { IsEnum, IsObject, IsString } from 'class-validator';

export class CreateIntegrationRequestDto {
  @IsString()
  name!: string;

  @IsEnum(['api', 'database', 'google_sheets'])
  sourceType!: 'api' | 'database' | 'google_sheets';

  @IsString()
  secretRef!: string;

  @IsObject()
  fieldMapping!: Record<string, unknown>;

  @IsObject()
  connectionConfig!: Record<string, unknown>;

  @IsEnum(['manual', 'daily', 'weekly', 'monthly'])
  syncFrequency!: 'manual' | 'daily' | 'weekly' | 'monthly';
}
