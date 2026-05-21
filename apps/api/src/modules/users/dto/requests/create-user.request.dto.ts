import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserRequestDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  /**
   * Optional. If omitted, a temporary password is generated and the user
   * receives a set-password email link to choose their own credentials.
   */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsEnum(['super_admin', 'admin', 'analyst', 'uploader', 'ops_manager', 'compliance_officer', 'viewer'])
  roleCode!: string;
}
