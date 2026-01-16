import { IsString, IsArray, IsOptional, IsBoolean, ArrayNotEmpty } from 'class-validator';
import { Permission } from '../../shared/constants/permissions';

export class CreateRoleDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissions?: Permission[] = [];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean = false;
}