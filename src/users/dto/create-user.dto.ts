import { IsString, IsEmail, IsOptional, IsMongoId, IsArray, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsMongoId()
  tenant?: Types.ObjectId;

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