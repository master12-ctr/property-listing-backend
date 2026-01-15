import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PropertyEntity } from './property.entity';
import { Property, PropertyStatus } from '../../domain/property/Property';
import { IPropertyRepository } from '../../domain/property/Property.repository.interface';
import { QueryPropertyDto } from '../../dto/query-property.dto';

@Injectable()
export class PropertyRepository implements IPropertyRepository {
  constructor(
    @InjectModel(PropertyEntity.name)
    private readonly propertyModel: Model<PropertyEntity>,
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
      .exec();
    return updated ? this.toDomain(updated) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.propertyModel.findByIdAndUpdate(id, { 
      deletedAt: new Date() 
    }).exec();
  }

  async publish(id: string): Promise<Property> {
    const session = await this.propertyModel.db.startSession();
    session.startTransaction();

    try {
      const property = await this.propertyModel
        .findById(id)
        .session(session);

      if (!property) {
        throw new Error('Property not found');
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
      .exec();
    return updated ? this.toDomain(updated) : null;
  }

  async findById(id: string): Promise<Property | null> {
    const entity = await this.propertyModel
      .findById(id)
      .populate('owner', 'name email')
      .exec();
    return entity ? this.toDomain(entity) : null;
  }

  async findByOwner(ownerId: string, status?: PropertyStatus): Promise<Property[]> {
    const query: any = { owner: new Types.ObjectId(ownerId) };
    if (status) query.status = status;

    const entities = await this.propertyModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    
    return entities.map(entity => this.toDomain(entity));
  }

  async findAllPaginated(query: QueryPropertyDto): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = {};
    
    if (query.status) filter.status = query.status;
    if (query.city) filter['location.city'] = new RegExp(query.city, 'i');
    if (query.type) filter.type = query.type;
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = query.minPrice;
      if (query.maxPrice) filter.price.$lte = query.maxPrice;
    }

    const skip = (query.page - 1) * query.limit;
    const sort = { [query.sortBy]: query.sortOrder === 'desc' ? -1 : 1 };

    const [entities, total] = await Promise.all([
      this.propertyModel
        .find(filter)
        .populate('owner', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .exec(),
      this.propertyModel.countDocuments(filter).exec(),
    ]);

    return {
      data: entities.map(entity => this.toDomain(entity)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findFavorites(userId: string): Promise<Property[]> {
    const entities = await this.propertyModel
      .find({
        favoritedBy: new Types.ObjectId(userId),
        status: PropertyStatus.PUBLISHED,
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
      throw new Error('Property not found');
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
      throw new Error('Property not found');
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
    property.location = entity.location;
    property.price = entity.price;
    property.images = entity.images;
    property.status = entity.status;
    property.type = entity.type;
    property.ownerId = entity.owner.toString();
    property.views = entity.views;
    property.favoritesCount = entity.favoritesCount;
    property.metadata = entity.metadata;
    property.publishedAt = entity.publishedAt;
    property.deletedAt = entity.deletedAt;
    property.createdAt = entity.createdAt;
    property.updatedAt = entity.updatedAt;
    return property;
  }

  private toEntity(property: Property): PropertyEntity {
    const entity = new this.propertyModel();
    entity.title = property.title;
    entity.description = property.description;
    entity.location = property.location;
    entity.price = property.price;
    entity.images = property.images;
    entity.status = property.status;
    entity.type = property.type;
    entity.owner = new Types.ObjectId(property.ownerId);
    entity.views = property.views;
    entity.favoritesCount = property.favoritesCount;
    entity.metadata = property.metadata;
    entity.publishedAt = property.publishedAt;
    entity.deletedAt = property.deletedAt;
    return entity;
  }
}