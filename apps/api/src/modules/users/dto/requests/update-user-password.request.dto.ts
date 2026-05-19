import { IsString, MinLength } from 'class-validator';

export class UpdateUserPasswordRequestDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
