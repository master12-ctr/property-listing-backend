
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyController } from './controllers/property.controller';
import { PropertyCommands } from './usecases/property/property.commands';
import { PropertyQueries } from './usecases/property/property.queries';
import { PropertyRepository } from './persistence/property/property.repository';
import { PropertyEntity, PropertySchema } from './persistence/property/property.entity';
import { ImagesModule } from '../images/images.module';
import { LoggerModule } from '../shared/infrastructure/logger/logger.module';
import { MetricsModule } from '../metrics/metrics.module';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyEntity.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => ImagesModule),
    LoggerModule,
    MetricsModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyCommands, PropertyQueries, PropertyRepository],
  exports: [PropertyCommands, PropertyQueries, MongooseModule],
})
export class PropertiesModule {}