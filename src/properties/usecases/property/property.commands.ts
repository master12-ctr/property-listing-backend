import { Injectable } from '@nestjs/common';
import { Property, PropertyStatus } from '../../domain/property/Property';
import { CreatePropertyDto } from '../../dto/create-property.dto';
import { UpdatePropertyDto } from '../../dto/update-property.dto';
import { PropertyRepository } from '../../persistence/property/property.repository';
import { UsersService } from '../../../users/users.service';
import { ImagesService } from '../../../images/images.service';
import { LoggerService } from '../../../shared/infrastructure/logger/logger.service';

@Injectable()
export class PropertyCommands {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly usersService: UsersService,
    private readonly imagesService: ImagesService,
    private readonly logger: LoggerService,
  ) {}

  async create(command: CreatePropertyDto, userId: string): Promise<Property> {
    this.logger.log('PropertyCommands', `Creating property for user ${userId}`);
    
    const property = new Property();
    property.title = command.title;
    property.description = command.description;
    property.location = command.location;
    property.price = command.price;
    property.images = command.images || [];
    property.type = command.type;
    property.status = command.status || PropertyStatus.DRAFT;
    property.ownerId = userId;
    property.metadata = command.metadata;

    const created = await this.propertyRepository.create(property);
    
    this.logger.log('PropertyCommands', `Property ${created.id} created successfully`);
    return created;
  }

  async update(
    propertyId: string, 
    command: UpdatePropertyDto, 
    userId: string,
    userPermissions: string[],
  ): Promise<Property> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }

    // Permission check
    const canUpdateAll = userPermissions.includes('property.update.all');
    const canUpdateOwn = userPermissions.includes('property.update.own');
    
    if (!canUpdateAll && (!canUpdateOwn || !property.isOwnedBy(userId))) {
      throw new Error('Insufficient permissions to update property');
    }

    // Business rule: Published properties cannot be edited
    if (!canUpdateAll && !property.canBeEdited()) {
      throw new Error('Published properties cannot be edited');
    }

    // Update allowed fields
    if (command.title !== undefined) property.title = command.title;
    if (command.description !== undefined) property.description = command.description;
    if (command.location !== undefined) property.location = command.location;
    if (command.price !== undefined) property.price = command.price;
    if (command.images !== undefined) property.images = command.images;
    if (command.type !== undefined) property.type = command.type;
    if (command.metadata !== undefined) property.metadata = command.metadata;

    const updated = await this.propertyRepository.update(propertyId, property);
    
    this.logger.log('PropertyCommands', `Property ${propertyId} updated by user ${userId}`);
    return updated;
  }

  async publish(propertyId: string, userId: string): Promise<Property> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }

    if (!property.isOwnedBy(userId)) {
      throw new Error('Only property owners can publish properties');
    }

    return await this.propertyRepository.publish(propertyId);
  }

  async archive(propertyId: string, userId: string): Promise<Property> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }

    if (!property.isOwnedBy(userId)) {
      throw new Error('Only property owners can archive properties');
    }

    return await this.propertyRepository.archive(propertyId);
  }

  async delete(
    propertyId: string, 
    userId: string,
    userPermissions: string[],
  ): Promise<void> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }

    // Permission check
    const canDeleteAll = userPermissions.includes('property.delete.all');
    const canDeleteOwn = userPermissions.includes('property.delete.own');
    
    if (!canDeleteAll && (!canDeleteOwn || !property.isOwnedBy(userId))) {
      throw new Error('Insufficient permissions to delete property');
    }

    await this.propertyRepository.softDelete(propertyId);
    
    this.logger.log('PropertyCommands', `Property ${propertyId} soft-deleted by user ${userId}`);
  }

  async addToFavorites(propertyId: string, userId: string): Promise<Property> {
    return await this.propertyRepository.addToFavorites(propertyId, userId);
  }

  async removeFromFavorites(propertyId: string, userId: string): Promise<Property> {
    return await this.propertyRepository.removeFromFavorites(propertyId, userId);
  }
}