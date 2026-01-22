import { Property, PropertyStatus, PropertyType } from '../../domain/property/Property';
import { PropertyEntity } from '../../persistence/property/property.entity';
import { Types } from 'mongoose';

export class PropertyResponse {
  id: string;
  title: string;
  description: string;
  location: {
    address: string;
    city: string;
    state?: string;
    country: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
  };
  price: number;
  images: string[];
  status: PropertyStatus;
  type: PropertyType;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  views: number;
  favoritesCount: number;
  metadata?: Record<string, any>;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isFavorited?: boolean;
  favoritedByCurrentUser?: boolean;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };

  static fromEntity(entity: PropertyEntity, userId?: string): PropertyResponse {
    const response = new PropertyResponse();
    response.id = entity._id.toString();
    response.title = entity.title;
    response.description = entity.description;
    response.location = {
      address: entity.location.address,
      city: entity.location.city,
      state: entity.location.state,
      country: entity.location.country,
    };
    
    if (entity.location.coordinates) {
      response.location.coordinates = {
        type: entity.location.coordinates.type || 'Point',
        coordinates: entity.location.coordinates.coordinates,
      };
    }
    
    response.price = entity.price;
    response.images = entity.images;
    response.status = entity.status;
    response.type = entity.type;
    
    // Check if owner is populated
    if (entity.owner && typeof entity.owner === 'object' && 'name' in entity.owner) {
      response.owner = {
        id: (entity.owner as any)._id.toString(),
        name: (entity.owner as any).name,
        email: (entity.owner as any).email,
      };
    } else {
      response.owner = {
        id: entity.owner.toString(),
        name: '',
        email: '',
      };
    }
    
    // Check if tenant is populated
    if (entity.tenant && typeof entity.tenant === 'object' && 'name' in entity.tenant) {
      response.tenant = {
        id: (entity.tenant as any)._id.toString(),
        name: (entity.tenant as any).name,
        slug: (entity.tenant as any).slug,
      };
    }
    
    response.views = entity.views;
    response.favoritesCount = entity.favoritesCount;
    response.metadata = entity.metadata;
    response.publishedAt = entity.publishedAt;
    response.createdAt = entity.createdAt;
    response.updatedAt = entity.updatedAt;
    
    // Add favorite status if userId is provided
    if (userId && entity.favoritedBy) {
      response.isFavorited = entity.favoritedBy.some(id => 
        id.toString() === userId || (id as Types.ObjectId).toString() === userId
      );
    }
    
    return response;
  }

 
  static fromDomain(property: Property, userId?: string): PropertyResponse {
  const response = new PropertyResponse();
  response.id = property.id;
  response.title = property.title;
  response.description = property.description;
  response.location = property.location;
  response.price = property.price;
  response.images = property.images;
  response.status = property.status;
  response.type = property.type;
  
  // Use populated owner data if available
  if ((property as any)._owner) {
    response.owner = {
      id: (property as any)._owner.id,
      name: (property as any)._owner.name,
      email: (property as any)._owner.email,
    };
  } else {
    response.owner = {
      id: property.ownerId,
      name: '',
      email: '',
    };
  }
  
  // Use populated tenant data if available
  if ((property as any)._tenant) {
    response.tenant = {
      id: (property as any)._tenant.id,
      name: (property as any)._tenant.name,
      slug: (property as any)._tenant.slug,
    };
  } else if (property.tenantId) {
    response.tenant = {
      id: property.tenantId,
      name: '',
      slug: '',
    };
  }
  
  response.views = property.views;
  response.favoritesCount = property.favoritesCount;
  response.metadata = property.metadata;
  response.publishedAt = property.publishedAt;
  response.createdAt = property.createdAt;
  response.updatedAt = property.updatedAt;
  
  // Add favorite status if userId is provided
  if (userId && property.favoritedBy) {
    response.isFavorited = property.favoritedBy.includes(userId);
  }
  
  return response;
}

}