import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, deletedAt: null }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password -__v').exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find({ deletedAt: null }).select('-password -__v').exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const user = new this.userModel(userData);
    return user.save();
  }

  async update(id: string, updateData: Partial<User>): Promise<UserDocument> {
    // Don't allow password update through this method
    if (updateData.password) {
      delete updateData.password;
    }
    
    const updated = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password -__v')
      .exec();
    
    if (!updated) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return updated;
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
}