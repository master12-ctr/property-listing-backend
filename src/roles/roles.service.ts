import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permission } from '../shared/constants/permissions';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
  ) {}

  async findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find({ deletedAt: null }).exec();
  }

  async findById(id: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.roleModel.findOne({ name, deletedAt: null }).exec();
  }

  async create(createRoleDto: CreateRoleDto): Promise<RoleDocument> {
    const existingRole = await this.findByName(createRoleDto.name);
    if (existingRole) {
      throw new BadRequestException(`Role with name ${createRoleDto.name} already exists`);
    }

    const role = new this.roleModel(createRoleDto);
    return role.save();
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleDocument> {
    const role = await this.findById(id);
    
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.findByName(updateRoleDto.name);
      if (existingRole && existingRole._id.toString() !== id) {
        throw new BadRequestException(`Role with name ${updateRoleDto.name} already exists`);
      }
    }

    Object.assign(role, updateRoleDto);
    return role.save();
  }

  async remove(id: string): Promise<void> {
    const role = await this.findById(id);
    
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    role.deletedAt = new Date();
    await role.save();
  }

  async addPermission(id: string, permission: Permission): Promise<RoleDocument> {
    const role = await this.findById(id);
    
    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
      await role.save();
    }
    
    return role;
  }

  async removePermission(id: string, permission: Permission): Promise<RoleDocument> {
    const role = await this.findById(id);
    
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify permissions of system roles');
    }

    role.permissions = role.permissions.filter(p => p !== permission);
    return role.save();
  }

  async getRolePermissions(id: string): Promise<Permission[]> {
    const role = await this.findById(id);
    return role.permissions;
  }

  async initializeDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: 'admin',
        description: 'System administrator with full access',
        permissions: [
          Permission.PROPERTY_READ_ALL,
          Permission.PROPERTY_UPDATE_ALL,
          Permission.PROPERTY_DELETE_ALL,
          Permission.USER_READ_ALL,
          Permission.USER_UPDATE_ALL,
          Permission.SYSTEM_METRICS_READ,
          Permission.SYSTEM_CONFIG_UPDATE,
        ],
        isSystem: true,
      },
      {
        name: 'property_owner',
        description: 'Property owner who can create and manage properties',
        permissions: [
          Permission.PROPERTY_CREATE,
          Permission.PROPERTY_READ_OWN,
          Permission.PROPERTY_UPDATE_OWN,
          Permission.PROPERTY_DELETE_OWN,
          Permission.PROPERTY_PUBLISH,
          Permission.PROPERTY_ARCHIVE,
          Permission.USER_READ_OWN,
          Permission.USER_UPDATE_OWN,
          Permission.FAVORITE_CREATE,
          Permission.FAVORITE_READ,
          Permission.FAVORITE_DELETE,
        ],
        isSystem: true,
      },
      {
        name: 'regular_user',
        description: 'Regular user who can view properties and save favorites',
        permissions: [
          Permission.USER_READ_OWN,
          Permission.USER_UPDATE_OWN,
          Permission.FAVORITE_CREATE,
          Permission.FAVORITE_READ,
          Permission.FAVORITE_DELETE,
        ],
        isSystem: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.findByName(roleData.name);
      if (!existingRole) {
        await this.create(roleData as CreateRoleDto);
      }
    }
  }
}