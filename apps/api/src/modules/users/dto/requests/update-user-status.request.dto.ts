import { IsEnum } from 'class-validator';

export class UpdateUserStatusRequestDto {
  @IsEnum(['active', 'inactive', 'suspended'])
  status!: 'active' | 'inactive' | 'suspended';
}
