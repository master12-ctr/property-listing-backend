import { IsString, IsEmail, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreateContactDto {
  @IsMongoId()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}