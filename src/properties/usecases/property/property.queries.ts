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
    tenantId?: string,
    userId?: string,
    userPermissions: string[] = [],
  ): Promise<{
    data: PropertyResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    // If user doesn't have permission to read all properties, only show published
    if (!userPermissions.includes(Permission.PROPERTY_READ_ALL)) {
      query.status = PropertyStatus.PUBLISHED;
    }

    const result = await this.propertyRepository.findAllPaginated(query, tenantId);
    
    return {
      data: result.data.map(property => PropertyResponse.fromDomain(property, userId)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  async findById(
    propertyId: string,
    tenantId?: string,
    userId?: string,
    userPermissions: string[] = [],
  ): Promise<PropertyResponse> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);
    
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // Permission checks
    const canReadAll = userPermissions.includes(Permission.PROPERTY_READ_ALL);
    const canReadOwn = userPermissions.includes(Permission.PROPERTY_READ_OWN);
    
    const isPublished = property.status === PropertyStatus.PUBLISHED;
    const isDisabled = property.status === PropertyStatus.DISABLED;
    
    if (isDisabled && !canReadAll) {
      throw new BadRequestException('Property is disabled');
    }
    
    // Handle undefined userId safely
    const isOwnedByUser = userId ? property.isOwnedBy(userId) : false;
    
    if (!isPublished && !canReadAll && (!canReadOwn || !isOwnedByUser)) {
      throw new BadRequestException('Insufficient permissions to view this property');
    }

    return PropertyResponse.fromDomain(property, userId);
  }

  async findByOwner(
    ownerId: string,
    tenantId: string,
    status?: string,
  ): Promise<PropertyResponse[]> {
    const propertyStatus = status ? (status as PropertyStatus) : undefined;
    const properties = await this.propertyRepository.findByOwner(ownerId, tenantId, propertyStatus);
    return properties.map(property => PropertyResponse.fromDomain(property, ownerId));
  }

  async findFavorites(userId: string, tenantId: string): Promise<PropertyResponse[]> {
    const properties = await this.propertyRepository.findFavorites(userId, tenantId);
    return properties.map(property => PropertyResponse.fromDomain(property, userId));
  }

  async isFavorited(propertyId: string, userId: string, tenantId: string): Promise<boolean> {
    return await this.propertyRepository.isFavorited(propertyId, userId, tenantId);
  }

  async incrementViews(id: string, tenantId?: string): Promise<void> {
    await this.propertyRepository.incrementViews(id, tenantId);
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

  async getTenantMetrics(tenantId: string): Promise<any> {
    return this.propertyRepository.getTenantMetrics(tenantId);
  }
}