import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema'; // Add this import
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>, // Add this line
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email, deletedAt: null })
      .populate('roles', 'name permissions')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .populate('roles', 'name permissions')
      .select('-password -__v')
      .exec();
  }

  async findByIdOrThrow(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel
      .find({ deletedAt: null })
      .populate('roles', 'name permissions')
      .select('-password -__v')
      .exec();
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Hash password if provided
    const hashedPassword = createUserDto.password 
      ? await bcrypt.hash(createUserDto.password, 10)
      : undefined;

    // Handle role assignment
    let roles: Types.ObjectId[] = [];
    
    if (createUserDto.roleName) {
      const role = await this.roleModel.findOne({ name: createUserDto.roleName });
      if (role) {
        roles = [role._id];
      }
    }
    
    // Set default role if not provided
    if (roles.length === 0) {
      const defaultRole = await this.roleModel.findOne({ name: 'regular_user' });
      if (defaultRole) {
        roles = [defaultRole._id];
      }
    }

    // Get or create default tenant
    let tenantId = createUserDto.tenant;
    if (!tenantId) {
      const defaultTenant = await this.tenantModel.findOne({ slug: 'main' });
      if (!defaultTenant) {
        // Create default tenant if it doesn't exist
        const newTenant = await this.tenantModel.create({
          name: 'Main Platform',
          slug: 'main',
          description: 'Default platform tenant',
          isActive: true,
        });
        tenantId = newTenant._id;
      } else {
        tenantId = defaultTenant._id;
      }
    }

    const userData = {
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      roles,
      tenant: tenantId,
      profileImage: createUserDto.profileImage,
      metadata: createUserDto.metadata,
      isActive: true,
    };

    const user = new this.userModel(userData);
    return user.save();
  }


  

  async addRole(userId: string, roleId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    const role = await this.roleModel.findById(roleId);

    if (!user || !role) {
      throw new NotFoundException('User or role not found');
    }

    // Check if user already has the role
    if (!user.roles.includes(role._id)) {
      user.roles.push(role._id);
      await user.save();
    }

    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }
    return updatedUser;
  }

  async removeRole(userId: string, roleId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.roles = user.roles.filter(role => !role.equals(new Types.ObjectId(roleId)));
    await user.save();

    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }
    return updatedUser;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userModel
      .findById(userId)
      .populate('roles', 'permissions')
      .exec();

    if (!user) {
      return [];
    }

    // Aggregate permissions from all roles
    const permissions = new Set<string>();
    
    // Handle both populated and non-populated roles
    const roles = user.roles;
    for (const role of roles) {
      if (role && typeof role === 'object') {
        const roleObj = role as any;
        if (roleObj.permissions && Array.isArray(roleObj.permissions)) {
          roleObj.permissions.forEach((permission: string) => {
            permissions.add(permission);
          });
        }
      }
    }

    return Array.from(permissions);
  }

  async remove(id: string): Promise<UserDocument> {
    // Soft delete
    const deleted = await this.userModel
      .findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true })
      .select('-password -__v')
      .exec();

    if (!deleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return deleted;
  }


  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);

    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }

    return null;
  }

  // Add toSafeObject method to UserDocument
  toSafeObject(user: UserDocument): any {
    if (user.toSafeObject && typeof user.toSafeObject === 'function') {
      return user.toSafeObject();
    }
    
    // Fallback if method doesn't exist
    const obj = user.toObject();
    const { password, __v, ...safeObj } = obj;
    return safeObj;
  }


  async updateRefreshToken(id: string, refreshToken: string): Promise<void> {
  await this.userModel.findByIdAndUpdate(id, { refreshToken }).exec();
}




async update(id: string, updateData: UpdateUserDto): Promise<UserDocument> {
  // Handle role update if roleName is provided
  if (updateData.roleName) {
    const role = await this.roleModel.findOne({ name: updateData.roleName });
    if (role) {
      // Remove all existing roles
      await this.userModel.findByIdAndUpdate(id, { $set: { roles: [] } });
      // Add the new role
      await this.userModel.findByIdAndUpdate(id, { $addToSet: { roles: role._id } });
    }
    // Remove roleName from updateData since it's not a field in User schema
    const { roleName, ...updateDataWithoutRole } = updateData;
    updateData = updateDataWithoutRole as any;
  }

  const updated = await this.userModel
    .findByIdAndUpdate(id, updateData, { new: true })
    .populate('roles', 'name permissions')
    .select('-password -__v -refreshToken')
    .exec();

  if (!updated) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }

  return updated;
}


  async toggleActive(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.isActive = !user.isActive;
    await user.save();

    return this.findByIdOrThrow(id);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(id, { password: hashedPassword }).exec();
  }
  

}