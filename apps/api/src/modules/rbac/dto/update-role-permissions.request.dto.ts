import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsRequestDto {
  @IsArray()
  @IsString({ each: true })
  permissionCodes!: string[];
}
