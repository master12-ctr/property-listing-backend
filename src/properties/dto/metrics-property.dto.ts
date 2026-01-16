import { IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class MetricsPropertyDto {
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  @Type(() => String)
  timeRange?: 'day' | 'week' | 'month' = 'week';
}