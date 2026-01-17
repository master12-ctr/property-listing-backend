import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: 'admin@example.com', 
    description: 'User email address' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'admin123', 
    description: 'User password' 
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}