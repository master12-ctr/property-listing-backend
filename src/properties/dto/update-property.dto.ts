import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsArray, 
  IsOptional, 
  Min, 
  MaxLength, 
  ArrayMaxSize,
  ValidateNested,
  IsObject 
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyStatus, PropertyType } from '../domain/property/Property';

class LocationDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  coordinates?: [number, number];
}

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}