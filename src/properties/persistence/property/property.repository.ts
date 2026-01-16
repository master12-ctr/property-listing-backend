import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(property: Property): Promise<Property> {
    const entity = this.toEntity(property);
    const saved = await this.propertyModel.create(entity);
    return this.toDomain(saved);
  }

  async update(id: string, property: Property): Promise<Property> {
    const entity = this.toEntity(property);
    const updated = await this.propertyModel
      .findByIdAndUpdate(id, entity, { new: true })
      .populate('owner', 'name email')
      .exec();
    
    if (!updated) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }
    
    return this.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.propertyModel.findByIdAndUpdate(id, { 
      deletedAt: new Date() 
    }).exec();
    
    if (!result) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }
  }

  async publish(id: string): Promise<Property> {
    const session = await this.propertyModel.db.startSession();
    session.startTransaction();

    try {
      const property = await this.propertyModel
        .findById(id)
        .session(session);

      if (!property) {
        throw new NotFoundException(`Property with id ${id} not found`);
      }

      if (property.images.length === 0) {
        throw new Error('Property must have at least one image to publish');
      }

      property.status = PropertyStatus.PUBLISHED;
      property.publishedAt = new Date();
      
      await property.save({ session });
      await session.commitTransaction();

      return this.toDomain(property);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async archive(id: string): Promise<Property> {
    const updated = await this.propertyModel
      .findByIdAndUpdate(
        id,
        { status: PropertyStatus.ARCHIVED },
        { new: true },
      )
      .populate('owner', 'name email')
      .exec();
    
    if (!updated) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }
    
    return this.toDomain(updated);
  }

  async findById(id: string): Promise<Property | null> {
    const entity = await this.propertyModel
      .findById(id)
      .populate('owner', 'name email')
      .exec();
    return entity ? this.toDomain(entity) : null;
  }

  async findByOwner(ownerId: string, status?: PropertyStatus): Promise<Property[]> {
    const query: any = { owner: new Types.ObjectId(ownerId), deletedAt: null };
    if (status) query.status = status;

    const entities = await this.propertyModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('owner', 'name email')
      .exec();
    
    return entities.map(entity => this.toDomain(entity));
  }

  async findAllPaginated(query: QueryPropertyDto): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = { deletedAt: null };
    
    if (query.status) filter.status = query.status;
    if (query.city) filter['location.city'] = new RegExp(query.city, 'i');
    if (query.type) filter.type = query.type;
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    
    // Fix: Cast to Record<string, 1 | -1> to satisfy Mongoose type
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };

    const [entities, total] = await Promise.all([
      this.propertyModel
        .find(filter)
        .populate('owner', 'name email')
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

  async findFavorites(userId: string): Promise<Property[]> {
    const entities = await this.propertyModel
      .find({
        favoritedBy: new Types.ObjectId(userId),
        status: PropertyStatus.PUBLISHED,
        deletedAt: null,
      })
      .populate('owner', 'name email')
      .exec();
    
    return entities.map(entity => this.toDomain(entity));
  }

  async isFavorited(propertyId: string, userId: string): Promise<boolean> {
    const property = await this.propertyModel.findById(propertyId);
    return property?.favoritedBy.some(id => 
      id.equals(new Types.ObjectId(userId))
    ) || false;
  }

  async addToFavorites(propertyId: string, userId: string): Promise<Property> {
    const property = await this.propertyModel.findById(propertyId);
    
    if (!property) {
      throw new NotFoundException(`Property with id ${propertyId} not found`);
    }

    const userObjectId = new Types.ObjectId(userId);
    
    if (!property.favoritedBy.some(id => id.equals(userObjectId))) {
      property.favoritedBy.push(userObjectId);
      property.favoritesCount += 1;
      await property.save();
    }

    return this.toDomain(property);
  }

  async removeFromFavorites(propertyId: string, userId: string): Promise<Property> {
    const property = await this.propertyModel.findById(propertyId);
    
    if (!property) {
      throw new NotFoundException(`Property with id ${propertyId} not found`);
    }

    const userObjectId = new Types.ObjectId(userId);
    const initialLength = property.favoritedBy.length;

    property.favoritedBy = property.favoritedBy.filter(
      id => !id.equals(userObjectId),
    );

    if (property.favoritedBy.length < initialLength) {
      property.favoritesCount -= 1;
      await property.save();
    }

    return this.toDomain(property);
  }

  private toDomain(entity: PropertyEntity): Property {
    const property = new Property();
    property.id = entity._id.toString();
    property.title = entity.title;
    property.description = entity.description;
    
    // Fix: Ensure all required properties are present
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
    property.ownerId = entity.owner.toString();
    property.views = entity.views || 0;
    property.favoritesCount = entity.favoritesCount || 0;
    property.metadata = entity.metadata;
    property.publishedAt = entity.publishedAt;
    property.deletedAt = entity.deletedAt;
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
    
    return {
      title: property.title,
      description: property.description,
      location,
      price: property.price,
      images: property.images,
      status: property.status,
      type: property.type,
      owner: new Types.ObjectId(property.ownerId),
      views: property.views,
      favoritesCount: property.favoritesCount,
      metadata: property.metadata,
      publishedAt: property.publishedAt,
      deletedAt: property.deletedAt,
    };
  }
}