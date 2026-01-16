import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './shared/infrastructure/logger/logger.service';
import { AllExceptionFilter } from './shared/infrastructure/filter/exception.filter';
import { HttpExceptionFilter } from './shared/infrastructure/filter/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  // Security
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001'],
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionFilter(new LoggerService()));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Property Listing API')
    .setDescription('Multi-tenant property listing platform with permission-based access control')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Users')
    .addTag('Properties')
    .addTag('Favorites')
    .addTag('Images')
    .addTag('Tenants')
    .addTag('Contact')
    .addTag('Metrics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`, 'Bootstrap');
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`, 'Bootstrap');
  Logger.log(`🔑 Admin credentials loaded from environment variables`, 'Bootstrap');
}

bootstrap();