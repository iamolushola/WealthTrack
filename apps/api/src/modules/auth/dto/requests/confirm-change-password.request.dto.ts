import { IsString, MinLength } from 'class-validator';

/** Request body for the OTP-verified change-password flow (non-super-admin). */
export class ConfirmChangePasswordRequestDto {
  /** The 6-digit OTP received by email */
  @IsString()
  @MinLength(6)
  otp!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
