import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PropertyEntity, PropertyDocument } from './property.entity';
import { Property, PropertyStatus } from '../../domain/property/Property';
import { IPropertyRepository } from '../../domain/property/Property.repository.interface';
import { QueryPropertyDto } from '../../dto/query-property.dto';

@Injectable()
export class PropertyRepository implements IPropertyRepository {
  constructor(
    @InjectModel(PropertyEntity.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

 private buildTenantQuery(tenantId?: string, baseQuery: any = {}): any {
    const query = { ...baseQuery, deletedAt: null };
    
    if (tenantId) {
      query.tenant = new Types.ObjectId(tenantId);
    }
    
    return query;
  }

  async create(property: Property, tenantId: string): Promise<Property> {
    const entity = this.toEntity(property);
    entity.tenant = new Types.ObjectId(tenantId);
    const saved = await this.propertyModel.create(entity);
    return this.toDomain(saved);
  }

 
   async update(id: string, property: Property, tenantId?: string): Promise<Property> {
    const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });
    
    const entity = this.toEntity(property);
    const updated = await this.propertyModel
      .findOneAndUpdate(query, entity, { new: true })
      .populate('owner', 'name email')
      .populate('disabledBy', 'name email')
      .exec();
    
    if (!updated) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }
    
    return this.toDomain(updated);
  }


  async softDelete(id: string, tenantId?: string): Promise<void> {
    const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });

    const result = await this.propertyModel.findOneAndUpdate(
      query,
      { deletedAt: new Date() },
      { new: true },
    ).exec();
    
    if (!result) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }
  }


  async publish(id: string, tenantId?: string): Promise<Property> {
  const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });

  try {
    const property = await this.propertyModel
      .findOne(query)
      .populate('owner', 'name email')
      .populate('tenant', 'name slug')
      .exec();

    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    // Convert to domain for validation
    const domainProperty = this.toDomain(property);
    
    // Validate and publish
    domainProperty.publish();
    
    // Update entity
    property.status = domainProperty.status;
    property.publishedAt = domainProperty.publishedAt;
    
    await property.save();

    return domainProperty;
  } catch (error) {
    console.error('Error publishing property:', error);
    throw new BadRequestException(`Failed to publish property: ${error.message}`);
  }
}


async archive(id: string, tenantId?: string): Promise<Property> {
  const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });

  const updated = await this.propertyModel
    .findOneAndUpdate(
      query,
      { status: PropertyStatus.ARCHIVED },
      { new: true },
    )
    .populate('owner', 'name email')
    .populate('tenant', 'name slug description') // Add tenant population
    .populate('disabledBy', 'name email')
    .exec();
  
  if (!updated) {
    throw new NotFoundException(`Property with id ${id} not found`);
  }
  
  return this.toDomain(updated);
}

  async disable(id: string, disabledBy: string, tenantId?: string): Promise<Property> {
    const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });

    const updated = await this.propertyModel
      .findOneAndUpdate(
        query,
        { 
          status: PropertyStatus.DISABLED,
          disabledAt: new Date(),
          disabledBy: new Types.ObjectId(disabledBy),
        },
        { new: true },
      )
      .populate('owner', 'name email')
      .populate('disabledBy', 'name email')
      .exec();
    
    if (!updated) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }
    
    return this.toDomain(updated);
  }

  async enable(id: string, tenantId?: string): Promise<Property> {
    const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });

    const updated = await this.propertyModel
      .findOneAndUpdate(
        query,
        { 
          status: PropertyStatus.DRAFT,
          disabledAt: null,
          disabledBy: null,
        },
        { new: true },
      )
      .populate('owner', 'name email')
      .exec();
    
    if (!updated) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }
    
    return this.toDomain(updated);
  }



async findById(id: string, tenantId?: string, userId?: string): Promise<Property | null> {
  const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });

  const entity = await this.propertyModel
    .findOne(query)
    .populate('owner', 'name email') // Ensure owner is populated
    .populate({
      path: 'tenant',
      select: 'name slug description' // Ensure tenant is populated with correct fields
    })
    .populate('disabledBy', 'name email')
    .exec();
  
  if (!entity) {
    return null;
  }

  // Convert entity to domain
  const domainProperty = this.toDomain(entity);
  
  // Check if user can access this property
  // If property is published, anyone can see it
  if (domainProperty.status === PropertyStatus.PUBLISHED) {
    return domainProperty;
  }

  return domainProperty;
}



  
  async findByOwner(ownerId: string, tenantId?: string, status?: PropertyStatus): Promise<Property[]> {
  const query = this.buildTenantQuery(tenantId, { owner: new Types.ObjectId(ownerId) });
  
  // Only filter by status if explicitly provided
  if (status) {
    query.status = status;
  }

  const entities = await this.propertyModel
    .find(query)
    .sort({ createdAt: -1 })
    .populate('owner', 'name email')
    .populate('tenant', 'name slug')
    .exec();
  
  return entities.map(entity => this.toDomain(entity));
}




// Update the findAllPaginated method
async findAllPaginated(query: QueryPropertyDto, tenantId?: string, userId?: string, userPermissions: string[] = []): Promise<{
  data: Property[];
  total: number;
  page: number;
  limit: number;
}> {
  const filter = this.buildTenantQuery(tenantId);

  // Apply status filtering based on user permissions
  if (query.status) {
    // If user is admin or property owner, they can filter by any status
    if (userPermissions.includes('property.read.all') || userPermissions.includes('property.read.own')) {
      filter.status = query.status;
    } else {
      // Regular users can only see published properties
      filter.status = PropertyStatus.PUBLISHED;
    }
  } else {
    // If no status specified, show based on permissions
    if (!userPermissions.includes('property.read.all') && !userPermissions.includes('property.read.own')) {
      filter.status = PropertyStatus.PUBLISHED;
    }
    // Admin and property owners can see all statuses when no filter is applied
  }

  // If user is not admin and filtering for draft properties, only show their own drafts
  if (query.status === PropertyStatus.DRAFT && !userPermissions.includes('property.read.all')) {
    if (userId && Types.ObjectId.isValid(userId)) {
      filter.owner = new Types.ObjectId(userId);
    }
  }
  
  if (query.city) {
    filter['location.city'] = new RegExp(query.city, 'i');
  }
  
  if (query.type) {
    filter.type = query.type;
  }
  
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice !== undefined) {
      filter.price.$gte = Number(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      filter.price.$lte = Number(query.maxPrice);
    }
  }

  // Add geospatial query if near coordinates provided
  if (query.near && query.maxDistance) {
    try {
      const [lngStr, latStr] = query.near.split(',');
      const lng = parseFloat(lngStr);
      const lat = parseFloat(latStr);
      
      if (!isNaN(lng) && !isNaN(lat)) {
        filter['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: query.maxDistance
          }
        };
      }
    } catch (error) {
      console.warn('Invalid geospatial query:', error);
    }
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;
  
  // Build sort object
  const sort: Record<string, 1 | -1> = {};
  const sortBy = query.sortBy ?? 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  sort[sortBy] = sortOrder;

  // For price sorting, ensure correct field
  if (sortBy === 'price') {
    sort.price = sortOrder;
  }

  const [entities, total] = await Promise.all([
    this.propertyModel
      .find(filter)
      .populate('owner', 'name email')
      .populate('tenant', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec(),
    this.propertyModel.countDocuments(filter).exec(),
  ]);

  return {
    data: entities.map(entity => this.toDomain(entity)),
    total,
    page,
    limit,
  };
}






async findDraftsByOwner(ownerId: string, tenantId?: string): Promise<Property[]> {
  const query = this.buildTenantQuery(tenantId, {
    status: PropertyStatus.DRAFT,
    owner: new Types.ObjectId(ownerId),
  });

  const entities = await this.propertyModel
    .find(query)
    .populate('owner', 'name email')
    .populate('tenant', 'name slug')
    .exec();
  
  return entities.map(entity => this.toDomain(entity));
}



async findFavorites(userId: string, tenantId?: string): Promise<Property[]> {
  // Users should only be able to favorite published properties
  const query = this.buildTenantQuery(tenantId, {
    favoritedBy: new Types.ObjectId(userId),
    status: PropertyStatus.PUBLISHED, // Only published properties can be favorited
  });

  const entities = await this.propertyModel
    .find(query)
    .populate('owner', 'name email')
    .populate('tenant', 'name slug description') // Ensure description is included
    .exec();
  
  return entities.map(entity => this.toDomain(entity));
}


  async isFavorited(propertyId: string, userId: string, tenantId?: string): Promise<boolean> {
    const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(propertyId) });

    const property = await this.propertyModel.findOne(query);
    if (!property) {
      return false;
    }

    return property.favoritedBy.some(id => 
      id.equals(new Types.ObjectId(userId))
    );
  }




  async addToFavorites(propertyId: string, userId: string, tenantId?: string): Promise<Property> {
  const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(propertyId) });

  const property = await this.propertyModel.findOne(query);
  
  if (!property) {
    throw new NotFoundException(`Property with id ${propertyId} not found`);
  }

  // Business rule: Only published properties can be favorited
  if (property.status !== PropertyStatus.PUBLISHED) {
    throw new BadRequestException('Only published properties can be added to favorites');
  }

  const userObjectId = new Types.ObjectId(userId);
  
  if (!property.favoritedBy.some(id => id.equals(userObjectId))) {
    property.favoritedBy.push(userObjectId);
    property.favoritesCount += 1;
    await property.save();
  }

  // Populate owner and tenant before returning
  await property.populate('owner', 'name email');
  await property.populate('tenant', 'name slug description');
  
  return this.toDomain(property);
}

async removeFromFavorites(propertyId: string, userId: string, tenantId?: string): Promise<Property> {
  const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(propertyId) });

  const property = await this.propertyModel.findOne(query);
  
  if (!property) {
    throw new NotFoundException(`Property with id ${propertyId} not found`);
  }

  const userObjectId = new Types.ObjectId(userId);
  const initialLength = property.favoritedBy.length;

  property.favoritedBy = property.favoritedBy.filter(
    id => !id.equals(userObjectId),
  );

  if (property.favoritedBy.length < initialLength) {
    property.favoritesCount = Math.max(0, property.favoritesCount - 1);
    await property.save();
  }

  // Populate owner and tenant before returning
  await property.populate('owner', 'name email');
  await property.populate('tenant', 'name slug description');
  
  return this.toDomain(property);
}


async incrementViews(id: string, userId?: string, tenantId?: string): Promise<void> {
    const query = this.buildTenantQuery(tenantId, { _id: new Types.ObjectId(id) });

    if (userId) {
      // Only increment if user hasn't viewed before and property is published
      await this.propertyModel.findOneAndUpdate(
        {
          ...query,
          status: PropertyStatus.PUBLISHED,
          viewedBy: { $ne: new Types.ObjectId(userId) }
        },
        {
          $addToSet: { viewedBy: new Types.ObjectId(userId) },
          $inc: { views: 1 }
        },
        { new: true }
      ).exec();
    } else {
      // For unauthenticated users or no userId, don't increment
      // This ensures we only count unique authenticated users
      return;
    }
  }

  async getTenantMetrics(tenantId: string): Promise<any> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    
    const [
      totalProperties,
      publishedProperties,
      draftProperties,
      archivedProperties,
      disabledProperties,
      totalViews,
      totalFavorites,
      recentProperties,
      topViewedProperties,
    ] = await Promise.all([
      // Counts
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        deletedAt: null,
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.PUBLISHED,
        deletedAt: null,
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.DRAFT,
        deletedAt: null,
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.ARCHIVED,
        deletedAt: null,
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.DISABLED,
        deletedAt: null,
      }),
      
      // Aggregates
      this.propertyModel.aggregate([
        {
          $match: {
            tenant: tenantObjectId,
            deletedAt: null,
          }
        },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$views' }
          }
        }
      ]),
      
      this.propertyModel.aggregate([
        {
          $match: {
            tenant: tenantObjectId,
            deletedAt: null,
          }
        },
        {
          $group: {
            _id: null,
            totalFavorites: { $sum: '$favoritesCount' }
          }
        }
      ]),
      
      // Recent data
      this.propertyModel
        .find({
          tenant: tenantObjectId,
          deletedAt: null,
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('owner', 'name email')
        .exec(),
      
      this.propertyModel
        .find({
          tenant: tenantObjectId,
          deletedAt: null,
          status: PropertyStatus.PUBLISHED,
        })
        .sort({ views: -1 })
        .limit(5)
        .populate('owner', 'name email')
        .exec(),
    ]);

    return {
      tenantId,
      summary: {
        properties: {
          total: totalProperties,
          published: publishedProperties,
          draft: draftProperties,
          archived: archivedProperties,
          disabled: disabledProperties,
        },
        engagement: {
          totalViews: totalViews[0]?.totalViews || 0,
          totalFavorites: totalFavorites[0]?.totalFavorites || 0,
        },
      },
      recentActivity: {
        recentProperties: recentProperties.map(prop => ({
          id: prop._id.toString(),
          title: prop.title,
          status: prop.status,
          views: prop.views,
          createdAt: prop.createdAt,
          owner: {
            id: (prop.owner as any)._id.toString(),
            name: (prop.owner as any).name,
          },
        })),
        topViewedProperties: topViewedProperties.map(prop => ({
          id: prop._id.toString(),
          title: prop.title,
          views: prop.views,
          favoritesCount: prop.favoritesCount,
          status: prop.status,
        })),
      },
      updatedAt: new Date(),
    };
  }




  private toDomain(entity: PropertyEntity): Property {
  const property = new Property();
  property.id = entity._id.toString();
  property.title = entity.title;
  property.description = entity.description;
  
  property.location = {
    address: entity.location.address || '',
    city: entity.location.city || '',
    country: entity.location.country || '',
    state: entity.location.state,
  };
  
  if (entity.location.coordinates) {
    property.location.coordinates = {
      type: entity.location.coordinates.type || 'Point',
      coordinates: entity.location.coordinates.coordinates || [0, 0],
    };
  }
  
  property.price = entity.price || 0;
  property.images = entity.images || [];
  property.status = entity.status || PropertyStatus.DRAFT;
  property.type = entity.type;
  
  // Quick fix: cast to any
  const entityAny = entity as any;
  
  if (entityAny.owner) {
    if (typeof entityAny.owner === 'object' && '_id' in entityAny.owner) {
      property.ownerId = entityAny.owner._id.toString();
      (property as any)._owner = {
        id: entityAny.owner._id.toString(),
        name: entityAny.owner.name || '',
        email: entityAny.owner.email || ''
      };
    } else {
      property.ownerId = entityAny.owner.toString();
    }
  }
  
  if (entityAny.tenant) {
    if (typeof entityAny.tenant === 'object' && '_id' in entityAny.tenant) {
      property.tenantId = entityAny.tenant._id.toString();
      (property as any)._tenant = {
        id: entityAny.tenant._id.toString(),
        name: entityAny.tenant.name || '',
        slug: entityAny.tenant.slug || '',
        description: entityAny.tenant.description || ''
      };
    } else {
      property.tenantId = entityAny.tenant.toString();
    }
  }
  
  property.views = entity.views || 0;
  property.viewedBy = entity.viewedBy ? entity.viewedBy.map(id => id.toString()) : [];
  property.favoritesCount = entity.favoritesCount || 0;
  property.favoritedBy = entity.favoritedBy.map(id => id.toString());
  property.metadata = entity.metadata;
  property.publishedAt = entity.publishedAt;
  property.deletedAt = entity.deletedAt;
  property.disabledAt = entity.disabledAt;
  property.disabledBy = entity.disabledBy?.toString();
  property.createdAt = entity.createdAt;
  property.updatedAt = entity.updatedAt;
  
  return property;
}



  private toEntity(property: Property): Partial<PropertyEntity> {
    const location: any = {
      address: property.location.address,
      city: property.location.city,
      country: property.location.country,
      state: property.location.state,
    };
    
    if (property.location.coordinates) {
      location.coordinates = {
        type: property.location.coordinates.type || 'Point',
        coordinates: property.location.coordinates.coordinates,
      };
    }
    
    const entity: Partial<PropertyEntity> = {
      title: property.title,
      description: property.description,
      location,
      price: property.price,
      images: property.images,
      status: property.status,
      type: property.type,
      owner: new Types.ObjectId(property.ownerId),
      views: property.views,
      viewedBy: property.viewedBy ? property.viewedBy.map(id => new Types.ObjectId(id)) : [],
      favoritesCount: property.favoritesCount,
      favoritedBy: property.favoritedBy.map(id => new Types.ObjectId(id)),
      metadata: property.metadata,
      publishedAt: property.publishedAt,
      deletedAt: property.deletedAt,
      disabledAt: property.disabledAt,
    };
    
    if (property.disabledBy) {
      entity.disabledBy = new Types.ObjectId(property.disabledBy);
    }
    
    if (property.tenantId) {
      entity.tenant = new Types.ObjectId(property.tenantId);
    }
    
    return entity;
  }


}