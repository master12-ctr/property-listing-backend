import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as stream from 'stream';

@Injectable()
export class ImagesService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  validateFile(file: Express.Multer.File): void {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE', 5242880);
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

  async uploadImage(file: Express.Multer.File): Promise<string> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'property-listings',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException('Failed to upload image'));
          } else {
            resolve(result.secure_url);
          }
        },
      );

      const readableStream = new stream.Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const publicId = this.extractPublicId(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  private extractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return `property-listings/${filename.split('.')[0]}`;
  }
}