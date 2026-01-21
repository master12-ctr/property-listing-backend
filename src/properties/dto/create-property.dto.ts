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
  IsObject,
  ArrayMinSize,
  ArrayNotEmpty,
  ValidateIf,
  IsLatitude,
  IsLongitude
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyStatus, PropertyType } from '../domain/property/Property';

export class CoordinatesDto {
  @IsOptional()
  @IsString()
  type?: string = 'Point';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @ValidateIf(o => o.coordinates !== undefined)
  coordinates: [number, number];
}

export class LocationDto {
  @IsString()
  @MaxLength(500)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;
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
  images?: string[] = [];

  @IsEnum(PropertyType)
  type: PropertyType;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus = PropertyStatus.DRAFT;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}