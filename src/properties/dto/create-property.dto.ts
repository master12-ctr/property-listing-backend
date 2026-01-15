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
  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsArray()
  coordinates?: [number, number];
}

export class CreatePropertyDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

  @IsEnum(PropertyType)
  type: PropertyType;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}