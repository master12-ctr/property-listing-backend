import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ImagesService } from '../../images/images.service';
import { PropertyRepository } from '../persistence/property/property.repository';
import { Permission } from '../../shared/constants/permissions';
import { PropertyStatus } from '../domain/property/Property';

@Injectable()
export class PropertyImagesService {
  constructor(
    private readonly imagesService: ImagesService,
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async uploadPropertyImages(
    propertyId: string,
    files: Express.Multer.File[],
    userId: string,
    tenantId: string,
    userPermissions: string[] = [],
  ): Promise<{ urls: string[]; propertyId: string }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Check property exists and user has permission
    const property = await this.propertyRepository.findById(propertyId, tenantId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Permission check
    const canUpdateAll = userPermissions.includes(Permission.PROPERTY_UPDATE_ALL);
    const canUpdateOwn = userPermissions.includes(Permission.PROPERTY_UPDATE_OWN);
    
    if (!canUpdateAll && (!canUpdateOwn || !property.isOwnedBy(userId))) {
      throw new BadRequestException('Insufficient permissions to update property');
    }

    // Check if property can be edited
    if (!property.canBeEdited()) {
      throw new BadRequestException('Published or disabled properties cannot be edited');
    }

    // Upload images
    const folder = `property-listings/tenant-${tenantId}/user-${userId}/property-${propertyId}`;
    const urls = await this.imagesService.uploadMultipleImages(files, folder);

    // Update property with new images
    property.images = [...(property.images || []), ...urls];
    await this.propertyRepository.update(propertyId, property, tenantId);

    return { urls, propertyId };
  }

 
    async deletePropertyImages(
    propertyId: string,
    imageUrls: string[],
    userId: string,
    tenantId: string,
    userPermissions: string[] = [],
  ): Promise<void> {
    // Check property exists and user has permission
    const property = await this.propertyRepository.findById(propertyId, tenantId, userId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check if property can be edited (published properties cannot be edited)
    if (property.status === PropertyStatus.PUBLISHED) {
      throw new BadRequestException('Published properties cannot be edited');
    }

    // Permission check
    const canUpdateAll = userPermissions.includes(Permission.PROPERTY_UPDATE_ALL);
    const canUpdateOwn = userPermissions.includes(Permission.PROPERTY_UPDATE_OWN);
    const isOwner = property.isOwnedBy(userId);
    
    if (!canUpdateAll && (!canUpdateOwn || !isOwner)) {
      throw new BadRequestException('Insufficient permissions to update property');
    }

    // Filter out the images to delete
    const newImages = property.images.filter(img => !imageUrls.includes(img));
    
    // Update property with remaining images
    property.images = newImages;
    await this.propertyRepository.update(propertyId, property, tenantId);

    // Delete from cloud storage
    await this.imagesService.deleteMultipleImages(imageUrls);
  }
  
}