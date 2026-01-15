import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PropertyStatus, PropertyType } from '../../domain/property/Property';

export type PropertyDocument = PropertyEntity & Document;

// Define interface for transformed object
interface PropertyTransformed {
  [key: string]: any;
  __v?: number;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: PropertyTransformed) => {
      // Use destructuring to safely remove __v
      const { __v, ...rest } = ret;
      return rest;
    },
  },
})
export class PropertyEntity extends Document {
  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: {
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      state: String,
      country: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    required: true,
  })
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

  @Prop({ required: true, min: 0, index: true })
  price: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ 
    type: String, 
    enum: PropertyStatus, 
    default: PropertyStatus.DRAFT,
    index: true 
  })
  status: PropertyStatus;

  @Prop({ 
    type: String, 
    enum: PropertyType, 
    required: true 
  })
  type: PropertyType;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  })
  owner: Types.ObjectId;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  favoritesCount: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  favoritedBy: Types.ObjectId[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  publishedAt?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const PropertySchema = SchemaFactory.createForClass(PropertyEntity);

// Compound indexes
PropertySchema.index({ status: 1, deletedAt: 1 });
PropertySchema.index({ owner: 1, status: 1 });
PropertySchema.index({ 'location.city': 1, status: 1 });
PropertySchema.index({ price: 1, status: 1 });
PropertySchema.index({ 'location.coordinates': '2dsphere' });

// Pre-find hooks for soft delete
PropertySchema.pre('find', function() {
  this.where({ deletedAt: null });
});

PropertySchema.pre('findOne', function() {
  this.where({ deletedAt: null });
});

PropertySchema.pre('countDocuments', function() {
  this.where({ deletedAt: null });
});

// Add method to remove __v
PropertySchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};