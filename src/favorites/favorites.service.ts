import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PropertyEntity } from '../properties/persistence/property/property.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(PropertyEntity.name) private propertyModel: Model<PropertyEntity>,
  ) {}

  async addToFavorites(propertyId: string, userId: string): Promise<PropertyEntity> {
    const property = await this.propertyModel.findById(propertyId);

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    const userObjectId = new Types.ObjectId(userId);

    if (property.favoritedBy.some(id => id.equals(userObjectId))) {
      return property;
    }

    property.favoritedBy.push(userObjectId);
    property.favoritesCount += 1;

    return property.save();
  }

  async removeFromFavorites(propertyId: string, userId: string): Promise<PropertyEntity> {
    const property = await this.propertyModel.findById(propertyId);

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    const userObjectId = new Types.ObjectId(userId);
    const initialLength = property.favoritedBy.length;

    property.favoritedBy = property.favoritedBy.filter(
      id => !id.equals(userObjectId),
    );

    if (property.favoritedBy.length < initialLength) {
      property.favoritesCount -= 1;
    }

    return property.save();
  }

  async getUserFavorites(userId: string): Promise<PropertyEntity[]> {
    return this.propertyModel
      .find({
        favoritedBy: new Types.ObjectId(userId),
        status: 'published',
      })
      .populate('owner', 'name email')
      .exec();
  }

  async isPropertyFavorited(propertyId: string, userId: string): Promise<boolean> {
    const property = await this.propertyModel.findById(propertyId);
    
    if (!property) return false;

    return property.favoritedBy.some(
      id => id.equals(new Types.ObjectId(userId)),
    );
  }
}