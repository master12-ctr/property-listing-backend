import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as stream from 'stream';

@Injectable()
export class ImagesService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  validateFile(file: Express.Multer.File): void {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE', 5242880); // 5MB
    const allowedTypes = this.configService
      .get<string>('ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/webp')
      .split(',');

    if (file.size > maxSize) {
      throw new BadRequestException(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'property-listings'): Promise<string> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto:good' },
          ],
          resource_type: 'auto',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new BadRequestException(`Failed to upload image: ${error.message}`));
          } else if (result && result.secure_url) {
            resolve(result.secure_url);
          } else {
            reject(new BadRequestException('No result from Cloudinary'));
          }
        },
      );

      const readableStream = new stream.Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadMultipleImages(files: Express.Multer.File[], folder?: string): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const publicId = this.extractPublicId(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw new BadRequestException('Failed to delete image');
    }
  }

  async deleteMultipleImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map(url => this.deleteImage(url).catch(err => {
      console.error(`Failed to delete image ${url}:`, err);
      return null;
    }));
    
    await Promise.all(deletePromises);
  }

  private extractPublicId(url: string): string {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = url.split('/');
      const filenameWithExtension = urlParts[urlParts.length - 1];
      const filenameWithoutExtension = filenameWithExtension.split('.')[0];
      
      // Find the folder name
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex > -1) {
        const folderParts = urlParts.slice(uploadIndex + 2, -1);
        if (folderParts.length > 0) {
          return `${folderParts.join('/')}/${filenameWithoutExtension}`;
        }
      }
      
      return `property-listings/${filenameWithoutExtension}`;
    } catch (error) {
      throw new BadRequestException('Invalid Cloudinary URL');
    }
  }

  // Helper to generate optimized URLs
  generateOptimizedUrl(publicId: string, options: any = {}): string {
    const defaultOptions = {
      fetch_format: 'auto',
      quality: 'auto',
      width: 800,
      height: 600,
      crop: 'fill',
    };
    
    return cloudinary.url(publicId, { ...defaultOptions, ...options });
  }
}