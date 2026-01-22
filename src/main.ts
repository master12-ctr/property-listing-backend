import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


import helmet from 'helmet';

import { AppModule } from './app.module';
import { LoggerService } from './shared/infrastructure/logger/logger.service';
import { AllExceptionFilter } from './shared/infrastructure/filter/exception.filter';
import { HttpExceptionFilter } from './shared/infrastructure/filter/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
    cors: {
      origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001','https://property-listing-frontend.vercel.app/','https://property-listing-frontend.vercel.app'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    },
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3001'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  
  // app.use(compression());
  
  // Rate limiting
  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 100, // limit each IP to 100 requests per windowMs
  //   message: 'Too many requests from this IP, please try again later.',
  // });
  
  // Apply rate limiting to all routes except auth
  // app.use((req, res, next) => {
  //   if (req.path.startsWith('/api/v1/auth/')) {
  //     return next();
  //   }
  //   limiter(req, res, next);
  // });

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

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Property Listing API',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  });

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Property Listing API')
      .setDescription('Multi-tenant property listing platform with permission-based access control')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant-id')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Properties', 'Property listing and management')
      .addTag('Images', 'Image upload and management')
      .addTag('Tenants', 'Tenant management')
      .addTag('Contact', 'Property contact messages')
      .addTag('Metrics', 'System metrics and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Property Listing API Documentation',
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`, 'Bootstrap');
  if (process.env.NODE_ENV !== 'production') {
    Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
  Logger.log(`🏥 Health check at: http://localhost:${port}/health`, 'Bootstrap');
}

bootstrap();