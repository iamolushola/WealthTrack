import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateRoleRequestDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z_]+$/, { message: 'code must contain only lowercase letters and underscores' })
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
