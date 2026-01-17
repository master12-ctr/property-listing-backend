import { plainToClass } from 'class-transformer';
import { IsEnum, IsString, validateSync, IsOptional, IsNumber } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsString()
  MONGODB_URI: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRATION?: string = '7d';

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string = 'http://localhost:3001';

  @IsOptional()
  @IsNumber()
  PORT?: number = 3000;

  @IsOptional()
  @IsString()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  ADMIN_NAME?: string = 'Super Admin';

  @IsOptional()
  @IsString()
  DEFAULT_TENANT_SLUG?: string = 'main';

  @IsOptional()
  @IsString()
  DEFAULT_TENANT_NAME?: string = 'Main Platform';

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsNumber()
  SMTP_PORT?: number = 587;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string = 'Property Listing <noreply@example.com>';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const missingVars = errors
      .map(error => Object.values(error.constraints || {}))
      .flat()
      .join(', ');
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    } else {
      console.warn('Environment validation warnings:', missingVars);
    }
  }

  return validatedConfig;
}