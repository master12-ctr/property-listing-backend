
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Property, PropertyStatus } from '../../domain/property/Property';
import { QueryPropertyDto } from '../../dto/query-property.dto';
import { PropertyRepository } from '../../persistence/property/property.repository';
import { Permission } from '../../../shared/constants/permissions';
import { PropertyResponse } from './property.response';
import { MetricsService } from '../../../metrics/metrics.service';

@Injectable()
export class PropertyQueries {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    @Inject(MetricsService) private readonly metricsService: MetricsService,
  ) {}

  async findAll(
    query: QueryPropertyDto,
    userId: string,
    userPermissions: string[],
  ): Promise<{
    data: PropertyResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    // If user doesn't have permission to read all properties, only show published and not disabled
    if (!userPermissions.includes(Permission.PROPERTY_READ_ALL)) {
      query.status = PropertyStatus.PUBLISHED;
    }

    const result = await this.propertyRepository.findAllPaginated(query);
    
    return {
      data: result.data.map(property => PropertyResponse.fromDomain(property, userId)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  async findById(
    propertyId: string,
    userId: string,
    userPermissions: string[],
  ): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // Permission checks
    const canReadAll = userPermissions.includes(Permission.PROPERTY_READ_ALL);
    const canReadOwn = userPermissions.includes(Permission.PROPERTY_READ_OWN);
    
    // Always allow access to published properties
    const isPublished = property.status === PropertyStatus.PUBLISHED;
    const isDisabled = property.status === PropertyStatus.DISABLED;
    
    // Allow access if:
    // 1. Property is published and not disabled, OR
    // 2. User can read all properties, OR
    // 3. User can read own properties and owns this property
    if (isDisabled && !canReadAll) {
      throw new BadRequestException('Property is disabled');
    }
    
    if (!isPublished && !canReadAll && (!canReadOwn || !property.isOwnedBy(userId))) {
      throw new BadRequestException('Insufficient permissions to view this property');
    }

    return PropertyResponse.fromDomain(property, userId);
  }

  async findByOwner(
    ownerId: string,
    userId: string,
    userPermissions: string[],
    status?: PropertyStatus,
  ): Promise<PropertyResponse[]> {
    // Permission checks
    const canReadAll = userPermissions.includes(Permission.PROPERTY_READ_ALL);
    
    // Users can only view their own properties unless they have read-all permission
    if (!canReadAll && ownerId !== userId) {
      throw new BadRequestException('Insufficient permissions to view these properties');
    }

    const properties = await this.propertyRepository.findByOwner(ownerId, status);
    return properties.map(property => PropertyResponse.fromDomain(property, userId));
  }

  async findFavorites(userId: string): Promise<PropertyResponse[]> {
    const properties = await this.propertyRepository.findFavorites(userId);
    return properties.map(property => PropertyResponse.fromDomain(property, userId));
  }

  async isFavorited(propertyId: string, userId: string): Promise<boolean> {
    return await this.propertyRepository.isFavorited(propertyId, userId);
  }

  async getMetrics(userPermissions: string[]): Promise<any> {
  
    if (!userPermissions.includes(Permission.SYSTEM_METRICS_READ)) {
      throw new BadRequestException('Insufficient permissions to view system metrics');
    }

    return this.metricsService.getSystemMetrics();
  }

    async getPropertyMetrics(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    return this.metricsService.getPropertyMetrics(timeRange);
  }
}