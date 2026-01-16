import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { Permission } from '../../shared/constants/permissions';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissions?: Permission[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}