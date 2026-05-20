import { IsString, MinLength } from 'class-validator';

export class UpdateUserPasswordRequestDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
