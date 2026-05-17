import { IsOptional, IsString } from 'class-validator';

export class CreateCsvUploadRequestDto {
  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsString()
  fileChecksum!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
