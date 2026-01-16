import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import * as bcrypt from 'bcrypt';
import { TenantsService } from 'src/tenants/tenants.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @Inject(TenantsService) private tenantsService: TenantsService,
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
      const defaultTenant = await this.tenantsService.getDefaultTenant();
      tenantId = defaultTenant._id;
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


private async getDefaultTenant(): Promise<any> {
  // In a real system, you might have a Tenant model
  // For now, return null or create a default tenant
  return null;
}


  async update(id: string, updateData: Partial<User>): Promise<UserDocument> {
    // Don't allow password update through this method
    if (updateData.password) {
      delete updateData.password;
    }

    // Handle role updates
    if (updateData.roles) {
      // Validate all roles exist
      const roles = await this.roleModel.find({ 
        _id: { $in: updateData.roles },
        deletedAt: null 
      });
      if (roles.length !== updateData.roles.length) {
        throw new BadRequestException('One or more roles not found');
      }
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('roles', 'name permissions')
      .select('-password -__v')
      .exec();

    if (!updated) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return updated;
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

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(id, { password: hashedPassword }).exec();
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
    const obj = user.toObject();
    const { password, __v, ...safeObj } = obj;
    return safeObj;
  }
}