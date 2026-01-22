// backend/src/users/dto/update-user.dto.ts
import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  metadata?: {
    phone?: string;
    bio?: string;
    preferences?: Record<string, any>;
  };

}