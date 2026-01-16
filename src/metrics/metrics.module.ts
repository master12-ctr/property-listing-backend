
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsService } from './metrics.service';
import { PropertyEntity, PropertySchema } from '../properties/persistence/property/property.entity';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Contact, ContactSchema } from '../contact/schemas/contact.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyEntity.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
      { name: Contact.name, schema: ContactSchema },
    ]),
  ],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}