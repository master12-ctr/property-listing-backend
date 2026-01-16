
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  company?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone?: string;
}