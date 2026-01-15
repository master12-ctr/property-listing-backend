import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { PropertyEntity, PropertySchema } from '../properties/persistence/property/property.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PropertyEntity.name, schema: PropertySchema }]),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}