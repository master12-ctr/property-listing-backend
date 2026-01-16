
import { IsString, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsObject()
  settings?: {
    maxProperties?: number;
    maxUsers?: number;
    allowedPropertyTypes?: string[];
    customDomain?: string;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];
}