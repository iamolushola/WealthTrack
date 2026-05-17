import { IsString, IsUUID } from 'class-validator';

export class ConfirmImportRequestDto {
  @IsUUID()
  batchId!: string;

  @IsString()
  idempotencyKey!: string;
}
