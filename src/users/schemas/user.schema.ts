
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exclude } from 'class-transformer';

export type UserDocument = User & Document;

interface UserTransformed {
  [key: string]: any;
  password?: string;
  __v?: number;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: UserTransformed) => {
      const { password, __v, ...rest } = ret;
      return rest;
    },
  },
})
export class User extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true
  })
  email: string;

  @Prop({ required: true })
  @Exclude()
  password: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }], default: [] })
  roles: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenant: Types.ObjectId;

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

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  toSafeObject() {
    const obj = this.toObject();
    const { password, __v, ...safeObj } = obj;
    return safeObj;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ tenant: 1, email: 1 }, { unique: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ deletedAt: 1 });
UserSchema.index({ isActive: 1 });

UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};