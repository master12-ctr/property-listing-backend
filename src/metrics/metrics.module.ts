import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsService } from './metrics.service';
import { PropertyEntity, PropertySchema } from '../properties/persistence/property/property.entity';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Contact, ContactSchema } from '../contact/schemas/contact.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyEntity.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}