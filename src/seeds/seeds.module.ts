
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedsService } from './seeds.service';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { TenantsModule } from '../tenants/tenants.module';
import { Role, RoleSchema } from '../roles/schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    UsersModule,
    RolesModule,
    TenantsModule,
  ],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}