import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../shared/constants/permissions';
import { ImagesService } from './images.service';

@Controller('images')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @Permissions(Permission.PROPERTY_CREATE, Permission.PROPERTY_UPDATE_OWN)
  @UseInterceptors(FilesInterceptor('images', 10)) // max 10 images
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    try {
      const urls = await this.imagesService.uploadMultipleImages(files);
      return { urls };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}