import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyController } from './controllers/property.controller';
import { PropertyCommands } from './usecases/property/property.commands';
import { PropertyQueries } from './usecases/property/property.queries';
import { PropertyEntity, PropertySchema } from './persistence/property/property.entity';
import { ImagesModule } from '../images/images.module';
import { PropertyRepository } from 'src/auth/properties/persistence/property/property.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PropertyEntity.name, schema: PropertySchema }]),
    ImagesModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyCommands, PropertyQueries, PropertyRepository],
  exports: [PropertyCommands, PropertyQueries, MongooseModule],
})
export class PropertiesModule {}