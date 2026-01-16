import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Generate slug if not provided
    if (!createTenantDto.slug && createTenantDto.name) {
      createTenantDto.slug = createTenantDto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (!createTenantDto.slug) {
      throw new BadRequestException('Tenant slug is required');
    }

    // Check if slug already exists
    const existingTenant = await this.tenantModel.findOne({ 
      slug: createTenantDto.slug 
    }).exec();

    if (existingTenant) {
      throw new BadRequestException(`Tenant with slug '${createTenantDto.slug}' already exists`);
    }

    const tenant = new this.tenantModel(createTenantDto);
    return tenant.save();
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantModel
      .find({ deletedAt: null })
      .populate('owner', 'name email')
      .exec();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findById(id)
      .populate('owner', 'name email')
      .exec();

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantModel
      .findOne({ slug, deletedAt: null })
      .populate('owner', 'name email')
      .exec();
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);

    // Update slug carefully
    if (updateTenantDto.slug && updateTenantDto.slug !== tenant.slug) {
      const existingTenant = await this.findBySlug(updateTenantDto.slug);
      if (existingTenant) {
        throw new BadRequestException(`Tenant with slug '${updateTenantDto.slug}' already exists`);
      }
    }

    Object.assign(tenant, updateTenantDto);
    return tenant.save();
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findById(id);
    tenant.deletedAt = new Date();
    await tenant.save();
  }

  async getDefaultTenant(): Promise<Tenant> {
    let tenant = await this.tenantModel
      .findOne({ isActive: true, deletedAt: null })
      .sort({ createdAt: 1 })
      .exec();

    if (!tenant) {
      // Create a default tenant if none exists
      const newTenant = await this.create({
        name: 'Main Platform',
        slug: 'main',
        description: 'Default platform tenant',
        isActive: true,
      });
      return newTenant;
    }

    return tenant;
  }

  async getTenantUsersCount(tenantId: string): Promise<number> {
    // We'll need to import UserModel or inject it
    // For now, we'll return 0 and fix later with proper dependency
    return 0;
  }

  async getTenantPropertiesCount(tenantId: string): Promise<number> {
    // We'll need to import PropertyModel or inject it
    return 0;
  }
}