import { IsOptional, IsString } from 'class-validator';

export class UpdateRoleRequestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
