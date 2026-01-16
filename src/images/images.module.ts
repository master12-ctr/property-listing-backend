import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { CloudinaryConfig } from '../config/cloudinary.config';

@Module({
  imports: [ConfigModule],
  controllers: [ImagesController],
  providers: [ImagesService, CloudinaryConfig],
  exports: [ImagesService],
})
export class ImagesModule {}