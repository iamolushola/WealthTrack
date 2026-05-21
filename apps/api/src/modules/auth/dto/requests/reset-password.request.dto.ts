import { IsString, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  /** The token ID returned in the reset-password email link (?id=...) */
  @IsString()
  tokenId!: string;

  /** The raw token returned in the reset-password email link (?token=...) */
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
