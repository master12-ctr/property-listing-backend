import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TenantDocument = Tenant & Document;

interface TenantToJSON {
  _id: Types.ObjectId;
  __v: number;
  [key: string]: any;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret: TenantToJSON) {
      const { _id, __v, ...rest } = ret;
      return {
        id: _id.toString(),
        ...rest
      };
    },
  },
})
export class Tenant extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  slug: string; 

  @Prop({ required: true })
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  owner: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  settings: {
    maxProperties: number;
    maxUsers: number;
    allowedPropertyTypes: string[];
    customDomain?: string;
  };

  @Prop({ type: [String], default: [] })
  allowedDomains: string[];

  @Prop()
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Indexes
TenantSchema.index({ slug: 1 }, { unique: true });
TenantSchema.index({ owner: 1 });
TenantSchema.index({ isActive: 1 });