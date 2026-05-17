import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserRequestDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(['admin', 'analyst', 'uploader'])
  roleCode!: 'admin' | 'analyst' | 'uploader';
}
