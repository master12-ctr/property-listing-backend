import { Injectable } from '@nestjs/common';
import { Property } from '../../domain/property/Property';
import { Permission } from '../../../shared/constants/permissions';
import { PropertyRepository } from 'src/auth/properties/persistence/property/property.repository';
import { QueryPropertyDto } from 'src/properties/dto/query-property.dto';

@Injectable()
export class PropertyQueries {
  constructor(
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async findAll(
    query: QueryPropertyDto,
    userId: string,
    userPermissions: string[],
  ): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
  }> {
    // If user doesn't have permission to read all properties, only show published
    if (!userPermissions.includes(Permission.PROPERTY_READ_ALL)) {
      query.status = 'published'; // Force published status
    }

    return await this.propertyRepository.findAllPaginated(query);
  }

  async findById(
    propertyId: string,
    userId: string,
    userPermissions: string[],
  ): Promise<Property> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }

    // Permission checks
    const canReadAll = userPermissions.includes(Permission.PROPERTY_READ_ALL);
    const canReadOwn = userPermissions.includes(Permission.PROPERTY_READ_OWN);
    
    // Always allow access to published properties
    const isPublished = property.status === 'published';
    
    // Allow access if:
    // 1. Property is published, OR
    // 2. User can read all properties, OR
    // 3. User can read own properties and owns this property
    if (!isPublished && !canReadAll && (!canReadOwn || !property.isOwnedBy(userId))) {
      throw new Error('Insufficient permissions to view this property');
    }

    return property;
  }

  async findByOwner(
    ownerId: string,
    userId: string,
    userPermissions: string[],
    status?: string,
  ): Promise<Property[]> {
    // Permission checks
    const canReadAll = userPermissions.includes(Permission.PROPERTY_READ_ALL);
    
    // Users can only view their own properties unless they have read-all permission
    if (!canReadAll && ownerId !== userId) {
      throw new Error('Insufficient permissions to view these properties');
    }

    return await this.propertyRepository.findByOwner(ownerId, status as any);
  }

  async findFavorites(userId: string): Promise<Property[]> {
    return await this.propertyRepository.findFavorites(userId);
  }

  async isFavorited(propertyId: string, userId: string): Promise<boolean> {
    return await this.propertyRepository.isFavorited(propertyId, userId);
  }

  async getMetrics(userPermissions: string[]): Promise<any> {
    // Only users with system metrics permission can view metrics
    if (!userPermissions.includes(Permission.SYSTEM_METRICS_READ)) {
      throw new Error('Insufficient permissions to view system metrics');
    }

    // Implement metrics logic here
    // This would typically aggregate data from multiple sources
    return {
      totalProperties: 0,
      publishedProperties: 0,
      totalUsers: 0,
      recentProperties: [],
    };
  }
}