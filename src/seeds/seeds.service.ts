// ./seeds/seeds.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { TenantsService } from '../tenants/tenants.service';
import { Role } from '../roles/schemas/role.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class SeedsService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private rolesService: RolesService,
    private tenantsService: TenantsService,
    @InjectModel(Role.name) private roleModel: Model<Role>,
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
    // RolesModule already initializes default roles
  }

  private async seedDefaultTenant() {
    const defaultTenantSlug = this.configService.get('DEFAULT_TENANT_SLUG', 'main');
    const defaultTenantName = this.configService.get('DEFAULT_TENANT_NAME', 'Main Platform');
    
    let tenant = await this.tenantsService.findBySlug(defaultTenantSlug);
    
    if (!tenant) {
      tenant = await this.tenantsService.create({
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
      const existingAdmin = await this.usersService.findByEmail(adminEmail);
      
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

      // Create admin user directly with role ID
      const adminUserData = {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        roles: [adminRole._id],
        tenant: defaultTenant._id,
        isActive: true,
      };

      // Use the User model directly to bypass roleName validation
      const UserModel = this.usersService['userModel']; // Access private model
      const adminUser = new UserModel(adminUserData);
      await adminUser.save();

      console.log(`✅ Super Admin user created: ${adminEmail}`);
      console.log(`   Name: ${adminName}`);
      console.log(`   Tenant: ${defaultTenant.name}`);
      
    } catch (error) {
      console.error('❌ Failed to create admin user:', error.message);
    }
  }
}