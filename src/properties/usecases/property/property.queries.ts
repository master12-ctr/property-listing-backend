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
  // For non-admin users, we need to handle special cases
  if (!userPermissions.includes(Permission.PROPERTY_READ_ALL)) {
    const canReadOwn = userPermissions.includes(Permission.PROPERTY_READ_OWN);
    
    if (!canReadOwn) {
      // Regular users can only see published properties
      query.status = PropertyStatus.PUBLISHED;
    } else if (userId && query.status === PropertyStatus.DRAFT) {
      // Property owners querying for draft properties - let them see their own drafts
      // We'll handle this differently - need to filter after fetching
    }
  }

  const result = await this.propertyRepository.findAllPaginated(query, tenantId);
  
  // Filter results for property owners
  if (!userPermissions.includes(Permission.PROPERTY_READ_ALL)) {
    const canReadOwn = userPermissions.includes(Permission.PROPERTY_READ_OWN);
    
    if (canReadOwn && userId) {
      // Property owners can see:
      // 1. All published properties
      // 2. Their own draft properties
      result.data = result.data.filter(property => 
        property.status === PropertyStatus.PUBLISHED || 
        (property.status === PropertyStatus.DRAFT && property.ownerId === userId)
      );
    } else if (!canReadOwn) {
      // Regular users can only see published properties
      result.data = result.data.filter(property => 
        property.status === PropertyStatus.PUBLISHED
      );
    }
  }
  
  return {
    data: result.data.map(property => PropertyResponse.fromDomain(property, userId)),
    total: result.data.length, // Update total to reflect filtered count
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

  // If property is published, anyone can view it
  if (property.status === PropertyStatus.PUBLISHED) {
    return PropertyResponse.fromDomain(property, userId);
  }

  // Check if user is the owner
  const isOwnedByUser = userId ? property.isOwnedBy(userId) : false;
  
  // If property is owned by user, they can view it regardless of status (except disabled)
  if (isOwnedByUser && property.status !== PropertyStatus.DISABLED) {
    return PropertyResponse.fromDomain(property, userId);
  }

  // Admin can view any property
  const canReadAll = userPermissions.includes(Permission.PROPERTY_READ_ALL);
  if (canReadAll) {
    return PropertyResponse.fromDomain(property, userId);
  }

  // Check for property.read.own permission
  const canReadOwn = userPermissions.includes(Permission.PROPERTY_READ_OWN);
  
  // If property is disabled, only admin can view
  if (property.status === PropertyStatus.DISABLED) {
    throw new BadRequestException('Property is disabled');
  }

  // If user has property.read.own permission and owns the property
  if (canReadOwn && isOwnedByUser) {
    return PropertyResponse.fromDomain(property, userId);
  }

  throw new BadRequestException('Insufficient permissions to view this property');
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