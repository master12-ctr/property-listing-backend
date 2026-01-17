// ./properties/properties.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyController } from './controllers/property.controller';
import { PropertyCommands } from './usecases/property/property.commands';
import { PropertyQueries } from './usecases/property/property.queries';
import { PropertyRepository } from './persistence/property/property.repository';
import { PropertyEntity, PropertySchema } from './persistence/property/property.entity';
import { LoggerModule } from '../shared/infrastructure/logger/logger.module';
import { MetricsModule } from '../metrics/metrics.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ImagesModule } from '../images/images.module';
import { PropertyImagesService } from './services/property-images.service'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyEntity.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
    ]),
    ImagesModule,
    LoggerModule,
    MetricsModule,
  ],
  controllers: [PropertyController],
  providers: [
    PropertyCommands, 
    PropertyQueries, 
    PropertyRepository,
    PropertyImagesService, 
  ],
  exports: [
    PropertyCommands, 
    PropertyQueries, 
    PropertyRepository,
    PropertyImagesService, 
    MongooseModule,
  ],
})
export class PropertiesModule {}