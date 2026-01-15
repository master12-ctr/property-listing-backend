import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}