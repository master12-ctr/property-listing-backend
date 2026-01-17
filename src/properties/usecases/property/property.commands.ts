import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Property, PropertyStatus } from '../../domain/property/Property';
import { CreatePropertyDto } from '../../dto/create-property.dto';
import { UpdatePropertyDto } from '../../dto/update-property.dto';
import { PropertyRepository } from '../../persistence/property/property.repository';
import { PropertyResponse } from './property.response';
import { LoggerService } from '../../../shared/infrastructure/logger/logger.service';
import { Permission } from '../../../shared/constants/permissions';

@Injectable()
export class PropertyCommands {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly logger: LoggerService,
  ) {}

  async create(command: CreatePropertyDto, userId: string, tenantId: string): Promise<PropertyResponse> {
    this.logger.log('PropertyCommands', `Creating property for user ${userId} in tenant ${tenantId}`);
    
    const property = new Property();
    property.title = command.title;
    property.description = command.description;
    
    property.location = {
      address: command.location.address,
      city: command.location.city,
      country: command.location.country,
      state: command.location.state,
    };
    
    if (command.location.coordinates) {
      property.location.coordinates = {
        type: command.location.coordinates.type || 'Point',
        coordinates: command.location.coordinates.coordinates,
      };
    }
    
    property.price = command.price;
    property.images = command.images || [];
    property.type = command.type;
    property.status = command.status || PropertyStatus.DRAFT;
    property.ownerId = userId;
    property.tenantId = tenantId;
    property.metadata = command.metadata;

    const created = await this.propertyRepository.create(property, tenantId);
    
    this.logger.log('PropertyCommands', `Property ${created.id} created successfully`);
    return PropertyResponse.fromDomain(created);
  }

  async update(
    propertyId: string, 
    command: UpdatePropertyDto, 
    userId: string,
    tenantId: string,
    userPermissions: string[],
  ): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // Business rule: Published properties cannot be edited (for anyone including admins)
    if (property.status === PropertyStatus.PUBLISHED) {
      throw new BadRequestException('Published properties cannot be edited');
    }

    // Permission check
    const canUpdateAll = userPermissions.includes(Permission.PROPERTY_UPDATE_ALL);
    const canUpdateOwn = userPermissions.includes(Permission.PROPERTY_UPDATE_OWN);
    
    if (!canUpdateAll && (!canUpdateOwn || !property.isOwnedBy(userId))) {
      throw new BadRequestException('Insufficient permissions to update property');
    }

    // Update allowed fields
    if (command.title !== undefined) property.title = command.title;
    if (command.description !== undefined) property.description = command.description;
    
    if (command.location !== undefined) {
      property.location = {
        address: command.location.address || property.location.address,
        city: command.location.city || property.location.city,
        country: command.location.country || property.location.country,
        state: command.location.state ?? property.location.state,
      };
      
      if (command.location.coordinates) {
        property.location.coordinates = {
          type: command.location.coordinates.type || 'Point',
          coordinates: command.location.coordinates.coordinates || [0, 0],
        };
      } else if (command.location.coordinates === null) {
        delete property.location.coordinates;
      }
    }
    
    if (command.price !== undefined) property.price = command.price;
    if (command.images !== undefined) property.images = command.images;
    if (command.type !== undefined) property.type = command.type;
    if (command.metadata !== undefined) property.metadata = command.metadata;

    const updated = await this.propertyRepository.update(propertyId, property, tenantId);
    
    this.logger.log('PropertyCommands', `Property ${propertyId} updated by user ${userId}`);
    return PropertyResponse.fromDomain(updated);
  }

  async publish(propertyId: string, userId: string, tenantId: string): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    if (!property.isOwnedBy(userId)) {
      throw new BadRequestException('Only property owners can publish properties');
    }

    const published = await this.propertyRepository.publish(propertyId, tenantId);
    return PropertyResponse.fromDomain(published);
  }

  async archive(propertyId: string, userId: string, tenantId: string): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    if (!property.isOwnedBy(userId)) {
      throw new BadRequestException('Only property owners can archive properties');
    }

    const archived = await this.propertyRepository.archive(propertyId, tenantId);
    return PropertyResponse.fromDomain(archived);
  }

  async delete(
    propertyId: string, 
    userId: string,
    tenantId: string,
    userPermissions: string[],
  ): Promise<void> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const canDeleteAll = userPermissions.includes(Permission.PROPERTY_DELETE_ALL);
    const canDeleteOwn = userPermissions.includes(Permission.PROPERTY_DELETE_OWN);
    
    if (!canDeleteAll && (!canDeleteOwn || !property.isOwnedBy(userId))) {
      throw new BadRequestException('Insufficient permissions to delete property');
    }

    await this.propertyRepository.softDelete(propertyId, tenantId);
    
    this.logger.log('PropertyCommands', `Property ${propertyId} soft-deleted by user ${userId}`);
  }

  async disable(
    propertyId: string, 
    userId: string,
    tenantId: string,
    userPermissions: string[],
  ): Promise<PropertyResponse> {
    if (!userPermissions.includes(Permission.PROPERTY_UPDATE_ALL)) {
      throw new BadRequestException('Only admins can disable properties');
    }

    const property = await this.propertyRepository.findById(propertyId, tenantId);
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const disabled = await this.propertyRepository.disable(propertyId, userId, tenantId);
    return PropertyResponse.fromDomain(disabled);
  }

  async enable(
    propertyId: string, 
    userId: string,
    tenantId: string,
    userPermissions: string[],
  ): Promise<PropertyResponse> {
    if (!userPermissions.includes(Permission.PROPERTY_UPDATE_ALL)) {
      throw new BadRequestException('Only admins can enable properties');
    }

    const property = await this.propertyRepository.findById(propertyId, tenantId);
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const enabled = await this.propertyRepository.enable(propertyId, tenantId);
    return PropertyResponse.fromDomain(enabled);
  }

  async validateForPublishing(propertyId: string, tenantId: string): Promise<any> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const validation = property.validateForPublishing();
    
    return {
      propertyId,
      isValid: validation.isValid,
      errors: validation.errors,
      canBePublished: property.status === PropertyStatus.DRAFT && validation.isValid,
      property: {
        title: property.title,
        status: property.status,
        hasImages: property.images?.length > 0,
        imageCount: property.images?.length || 0,
      }
    };
  }


  async addToFavorites(propertyId: string, userId: string, tenantId: string): Promise<PropertyResponse> {
  this.logger.log('PropertyCommands', `Adding property ${propertyId} to favorites for user ${userId}`);
  
  const property = await this.propertyRepository.addToFavorites(propertyId, userId, tenantId);
  return PropertyResponse.fromDomain(property);
}

async removeFromFavorites(propertyId: string, userId: string, tenantId: string): Promise<PropertyResponse> {
  this.logger.log('PropertyCommands', `Removing property ${propertyId} from favorites for user ${userId}`);
  
  const property = await this.propertyRepository.removeFromFavorites(propertyId, userId, tenantId);
  return PropertyResponse.fromDomain(property);
}

}