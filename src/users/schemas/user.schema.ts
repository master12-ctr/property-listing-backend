import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exclude } from 'class-transformer';
import { Permission } from '../../shared/constants/permissions';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Remove password and version key from response
      delete ret.password;
      delete ret.__v;
      return ret;
    },
  },
})
export class User extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  @Exclude()
  password: string;

  @Prop({ 
    type: [String], 
    enum: Object.values(Permission),
    default: []
  })
  permissions: Permission[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  profileImage?: string;

  @Prop({ type: Object })
  metadata?: {
    phone?: string;
    bio?: string;
    preferences?: Record<string, any>;
  };

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  // Virtual method to check permission
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  // Virtual method to check multiple permissions
  hasPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.permissions.includes(p));
  }

  // Instance method to get safe user object
  toSafeObject() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ permissions: 1 });
UserSchema.index({ deletedAt: 1 });