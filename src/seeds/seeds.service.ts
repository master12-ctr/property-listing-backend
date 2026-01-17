import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../roles/schemas/role.schema';
import { Tenant } from '../tenants/schemas/tenant.schema';
import { User } from '../users/schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedsService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async onModuleInit() {
    console.log('🚀 Starting database seeding...');
    
    // 1. Ensure default roles exist
    await this.seedDefaultRoles();
    
    // 2. Seed default tenant
    const defaultTenant = await this.seedDefaultTenant();
    
    // 3. Seed admin user from environment variables
    await this.seedAdminUser(defaultTenant);
    
    console.log('✅ Database seeding completed');
  }

  private async seedDefaultRoles() {
    console.log('📋 Checking default roles...');
    
    const defaultRoles = [
      {
        name: 'admin',
        description: 'System administrator with full access',
        permissions: [
          'property.read.all',
          'property.update.all',
          'property.delete.all',
          'user.read.all',
          'user.update.all',
          'system.metrics.read',
          'system.config.update',
        ],
        isSystem: true,
      },
      {
        name: 'property_owner',
        description: 'Property owner who can create and manage properties',
        permissions: [
          'property.create',
          'property.read.own',
          'property.update.own',
          'property.delete.own',
          'property.publish',
          'property.archive',
          'user.read.own',
          'user.update.own',
          'favorite.create',
          'favorite.read',
          'favorite.delete',
        ],
        isSystem: true,
      },
      {
        name: 'regular_user',
        description: 'Regular user who can view properties and save favorites',
        permissions: [
          'user.read.own',
          'user.update.own',
          'favorite.create',
          'favorite.read',
          'favorite.delete',
        ],
        isSystem: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.roleModel.findOne({ name: roleData.name });
      if (!existingRole) {
        await this.roleModel.create(roleData);
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        console.log(`✅ Role already exists: ${roleData.name}`);
      }
    }
  }

  private async seedDefaultTenant() {
    const defaultTenantSlug = this.configService.get('DEFAULT_TENANT_SLUG', 'main');
    const defaultTenantName = this.configService.get('DEFAULT_TENANT_NAME', 'Main Platform');
    
    let tenant = await this.tenantModel.findOne({ slug: defaultTenantSlug });
    
    if (!tenant) {
      tenant = await this.tenantModel.create({
        name: defaultTenantName,
        slug: defaultTenantSlug,
        description: 'Default platform tenant',
        isActive: true,
      });
      console.log(`✅ Default tenant created: ${defaultTenantName}`);
    } else {
      console.log(`✅ Default tenant already exists: ${defaultTenantName}`);
    }
    
    return tenant;
  }

  private async seedAdminUser(defaultTenant: any) {
    const adminEmail = this.configService.get('ADMIN_EMAIL');
    const adminPassword = this.configService.get('ADMIN_PASSWORD');
    const adminName = this.configService.get('ADMIN_NAME', 'Super Admin');

    if (!adminEmail || !adminPassword) {
      console.warn('⚠️  Admin credentials not set in environment variables');
      console.warn('   Set ADMIN_EMAIL and ADMIN_PASSWORD in .env file');
      return;
    }

    try {
      // Check if admin already exists
      const existingAdmin = await this.userModel.findOne({ email: adminEmail });
      
      if (existingAdmin) {
        console.log(`✅ Admin user already exists: ${adminEmail}`);
        return;
      }

      // Get admin role
      const adminRole = await this.roleModel.findOne({ name: 'admin' });
      
      if (!adminRole) {
        console.error('❌ Admin role not found');
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      const adminUserData = {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        roles: [adminRole._id],
        tenant: defaultTenant._id,
        isActive: true,
      };

      await this.userModel.create(adminUserData);

      console.log(`✅ Super Admin user created: ${adminEmail}`);
      console.log(`   Name: ${adminName}`);
      console.log(`   Tenant: ${defaultTenant.name}`);
      
    } catch (error) {
      console.error('❌ Failed to create admin user:', error.message);
    }
  }
}