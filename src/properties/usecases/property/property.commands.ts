import { Injectable, BadRequestException } from '@nestjs/common';
import { Property, PropertyStatus } from '../../domain/property/Property';
import { CreatePropertyDto } from '../../dto/create-property.dto';
import { UpdatePropertyDto } from '../../dto/update-property.dto';
import { PropertyRepository } from '../../persistence/property/property.repository';
import { PropertyResponse } from './property.response';
import { LoggerService } from '../../../shared/infrastructure/logger/logger.service';
import { Permission } from 'src/shared/constants/permissions';

@Injectable()
export class PropertyCommands {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly logger: LoggerService,
  ) {}

  async create(command: CreatePropertyDto, userId: string): Promise<PropertyResponse> {
    this.logger.log('PropertyCommands', `Creating property for user ${userId}`);
    
    const property = new Property();
    property.title = command.title;
    property.description = command.description;
    
    // Ensure location has all required properties
    property.location = {
      address: command.location.address,
      city: command.location.city,
      country: command.location.country,
      state: command.location.state,
    };
    
    // Handle coordinates if provided
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
    property.metadata = command.metadata;

    const created = await this.propertyRepository.create(property);
    
    this.logger.log('PropertyCommands', `Property ${created.id} created successfully`);
    return PropertyResponse.fromDomain(created);
  }

  async update(
    propertyId: string, 
    command: UpdatePropertyDto, 
    userId: string,
    userPermissions: string[],
  ): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // Permission check
    const canUpdateAll = userPermissions.includes('property.update.all');
    const canUpdateOwn = userPermissions.includes('property.update.own');
    
    if (!canUpdateAll && (!canUpdateOwn || !property.isOwnedBy(userId))) {
      throw new BadRequestException('Insufficient permissions to update property');
    }

    // Business rule: Published properties cannot be edited
    if (!canUpdateAll && !property.canBeEdited()) {
      throw new BadRequestException('Published properties cannot be edited');
    }

    // Update allowed fields
    if (command.title !== undefined) property.title = command.title;
    if (command.description !== undefined) property.description = command.description;
    
    // Handle location update
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

    const updated = await this.propertyRepository.update(propertyId, property);
    
    this.logger.log('PropertyCommands', `Property ${propertyId} updated by user ${userId}`);
    return PropertyResponse.fromDomain(updated);
  }

  async publish(propertyId: string, userId: string): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    if (!property.isOwnedBy(userId)) {
      throw new BadRequestException('Only property owners can publish properties');
    }

    const published = await this.propertyRepository.publish(propertyId);
    return PropertyResponse.fromDomain(published);
  }

  async archive(propertyId: string, userId: string): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    if (!property.isOwnedBy(userId)) {
      throw new BadRequestException('Only property owners can archive properties');
    }

    const archived = await this.propertyRepository.archive(propertyId);
    return PropertyResponse.fromDomain(archived);
  }

  async delete(
    propertyId: string, 
    userId: string,
    userPermissions: string[],
  ): Promise<void> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // Permission check
    const canDeleteAll = userPermissions.includes('property.delete.all');
    const canDeleteOwn = userPermissions.includes('property.delete.own');
    
    if (!canDeleteAll && (!canDeleteOwn || !property.isOwnedBy(userId))) {
      throw new BadRequestException('Insufficient permissions to delete property');
    }

    await this.propertyRepository.softDelete(propertyId);
    
    this.logger.log('PropertyCommands', `Property ${propertyId} soft-deleted by user ${userId}`);
  }

  async addToFavorites(propertyId: string, userId: string): Promise<PropertyResponse> {
    const property = await this.propertyRepository.addToFavorites(propertyId, userId);
    return PropertyResponse.fromDomain(property);
  }

  async removeFromFavorites(propertyId: string, userId: string): Promise<PropertyResponse> {
    const property = await this.propertyRepository.removeFromFavorites(propertyId, userId);
    return PropertyResponse.fromDomain(property);
  }




  async disable(
  propertyId: string, 
  userId: string,
  userPermissions: string[],
): Promise<PropertyResponse> {
  if (!userPermissions.includes(Permission.PROPERTY_UPDATE_ALL)) {
    throw new BadRequestException('Only admins can disable properties');
  }

  const property = await this.propertyRepository.findById(propertyId);
  if (!property) {
    throw new BadRequestException('Property not found');
  }

  property.disable(userId);
  const updated = await this.propertyRepository.update(propertyId, property);
  
  this.logger.log('PropertyCommands', `Property ${propertyId} disabled by admin ${userId}`);
  return PropertyResponse.fromDomain(updated);
}

async enable(
  propertyId: string, 
  userId: string,
  userPermissions: string[],
): Promise<PropertyResponse> {
  if (!userPermissions.includes(Permission.PROPERTY_UPDATE_ALL)) {
    throw new BadRequestException('Only admins can enable properties');
  }

  const property = await this.propertyRepository.findById(propertyId);
  if (!property) {
    throw new BadRequestException('Property not found');
  }

  property.enable();
  const updated = await this.propertyRepository.update(propertyId, property);
  
  this.logger.log('PropertyCommands', `Property ${propertyId} enabled by admin ${userId}`);
  return PropertyResponse.fromDomain(updated);
}


}