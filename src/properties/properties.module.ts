import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyController } from './controllers/property.controller';
import { PropertyCommands } from './usecases/property/property.commands';
import { PropertyQueries } from './usecases/property/property.queries';
import { PropertyRepository } from './persistence/property/property.repository';
import { PropertyEntity, PropertySchema } from './persistence/property/property.entity';
import { ImagesModule } from '../images/images.module';
import { LoggerModule } from '../shared/infrastructure/logger/logger.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PropertyEntity.name, schema: PropertySchema }]),
    ImagesModule,
    LoggerModule, // Add this import
  ],
  controllers: [PropertyController],
  providers: [PropertyCommands, PropertyQueries, PropertyRepository],
  exports: [PropertyCommands, PropertyQueries, MongooseModule],
})
export class PropertiesModule {}