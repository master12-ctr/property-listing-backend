import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Permission } from '../../shared/constants/permissions';

export type RoleDocument = Role & Document;

// Define interface for transformed object
interface RoleTransformed {
  [key: string]: any;
  __v?: number;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: RoleTransformed) => {
      // Use destructuring to safely remove __v
      const { __v, ...rest } = ret;
      return rest;
    },
  },
})
export class Role extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ 
    type: [String], 
    enum: Object.values(Permission),
    default: []
  })
  permissions: Permission[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isSystem: boolean; // System roles cannot be deleted

  @Prop()
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Indexes
RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ isActive: 1 });
RoleSchema.index({ isSystem: 1 });
RoleSchema.index({ deletedAt: 1 });

// Add method to remove __v
RoleSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};