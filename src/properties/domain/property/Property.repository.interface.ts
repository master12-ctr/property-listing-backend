import { Property, PropertyStatus } from './Property';
import { QueryPropertyDto } from '../../dto/query-property.dto';

export interface IPropertyRepository {
  // Commands
  create(property: Property): Promise<Property>;
  update(id: string, property: Property): Promise<Property>;
  softDelete(id: string): Promise<void>;
  publish(id: string): Promise<Property>;
  archive(id: string): Promise<Property>;
  
  // Queries
  findById(id: string): Promise<Property | null>;
  findByOwner(ownerId: string, status?: PropertyStatus): Promise<Property[]>;
  findAllPaginated(query: QueryPropertyDto): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
  }>;
  findFavorites(userId: string): Promise<Property[]>;
  isFavorited(propertyId: string, userId: string): Promise<boolean>;
  addToFavorites(propertyId: string, userId: string): Promise<Property>;
  removeFromFavorites(propertyId: string, userId: string): Promise<Property>;
}