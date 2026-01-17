import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantMiddleware } from './tenant.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  providers: [TenantsService, TenantMiddleware],
  controllers: [TenantsController],
  exports: [TenantsService, TenantMiddleware, MongooseModule],
})
export class TenantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/docs/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}