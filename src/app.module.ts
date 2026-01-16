
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

import { LoggerModule } from './shared/infrastructure/logger/logger.module';
import { ExceptionsModule } from './shared/infrastructure/exceptions/exceptions.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PropertiesModule } from './properties/properties.module';
import { ImagesModule } from './images/images.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ContactModule } from './contact/contact.module';
import { MetricsModule } from './metrics/metrics.module';
import { TenantsModule } from './tenants/tenants.module';
import { SeedsModule } from './seeds/seeds.module';
import { TenantMiddleware } from './tenants/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV 
        ? `.env.${process.env.NODE_ENV}` 
        : ['.env.development', '.env'],
      expandVariables: true,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/property_listing'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    ExceptionsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PropertiesModule,
    ImagesModule,
    FavoritesModule,
    ContactModule,
    MetricsModule,
    TenantsModule,
    SeedsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}