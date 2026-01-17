import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedsService } from './seeds.service';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}