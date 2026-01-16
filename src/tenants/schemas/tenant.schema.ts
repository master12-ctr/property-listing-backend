
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Tenant extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  domain: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  settings: Record<string, any>;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);