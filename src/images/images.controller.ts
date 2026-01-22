import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFiles, 
  UseGuards, 
  BadRequestException,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../shared/constants/permissions';
import { ImagesService } from './images.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.PROPERTY_CREATE, Permission.PROPERTY_UPDATE_OWN)
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    try {
      const folder = `property-listings/tenant-${user.tenantId || 'default'}/user-${user.userId}`;
      
      const urls = await this.imagesService.uploadMultipleImages(files, folder);
      return { 
        success: true,
        urls,
        count: urls.length,
        message: 'Images uploaded successfully' 
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('delete')
  async deleteImages(
    @Body() body: { urls: string[] },
    @GetUser() user: any,
  ) {
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      throw new BadRequestException('No image URLs provided');
    }

    try {
      // Check if any of these images belong to user's properties
      // This is a simplified check - in production, you'd want to verify ownership
      // by checking which properties contain these image URLs
      
      // For now, we'll allow deletion if the user is authenticated
      // In a real app, you should verify image ownership
      
      await this.imagesService.deleteMultipleImages(body.urls);
      return { 
        success: true,
        message: 'Images deleted successfully',
        deletedCount: body.urls.length 
      };
    } catch (error) {
      console.error('Failed to delete images:', error);
      throw new BadRequestException('Failed to delete images');
    }
  }

  @Post('optimize')
  async optimizeImage(@Body() body: { url: string; options?: any }) {
    if (!body.url) {
      throw new BadRequestException('Image URL is required');
    }

    try {
      const publicId = this.imagesService['extractPublicId'](body.url);
      const optimizedUrl = this.imagesService.generateOptimizedUrl(publicId, body.options);
      
      return {
        success: true,
        originalUrl: body.url,
        optimizedUrl,
        publicId,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}