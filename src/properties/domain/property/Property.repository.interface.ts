import { Property, PropertyStatus } from './Property';
import { QueryPropertyDto } from '../../dto/query-property.dto';

export interface IPropertyRepository {
  // Commands with tenant support
  create(property: Property, tenantId: string): Promise<Property>;
  update(id: string, property: Property, tenantId?: string): Promise<Property>;
  softDelete(id: string, tenantId?: string): Promise<void>;
  publish(id: string, tenantId?: string): Promise<Property>;
  archive(id: string, tenantId?: string): Promise<Property>;
  disable(id: string, disabledBy: string, tenantId?: string): Promise<Property>;
  enable(id: string, tenantId?: string): Promise<Property>;
  
  // Queries with tenant support
  findById(id: string, tenantId?: string): Promise<Property | null>;
  findByOwner(ownerId: string, tenantId?: string, status?: PropertyStatus): Promise<Property[]>;
  findAllPaginated(query: QueryPropertyDto, tenantId?: string): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
  }>;
  findFavorites(userId: string, tenantId?: string): Promise<Property[]>;
  isFavorited(propertyId: string, userId: string, tenantId?: string): Promise<boolean>;
  addToFavorites(propertyId: string, userId: string, tenantId?: string): Promise<Property>;
  removeFromFavorites(propertyId: string, userId: string, tenantId?: string): Promise<Property>;
  
  // Additional methods
  incrementViews(id: string, tenantId?: string): Promise<void>;
  getTenantMetrics(tenantId: string): Promise<any>;
}