import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSheetTabRequestDto {
  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;

  @IsOptional()
  @IsString()
  rangeNotation?: string;

  @IsOptional()
  @IsEnum(['active', 'ignored'])
  status?: 'active' | 'ignored';
}
