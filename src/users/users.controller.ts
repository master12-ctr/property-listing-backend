
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Permission } from '../shared/constants/permissions';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@GetUser() user: any) {
    return this.usersService.findByIdOrThrow(user.userId);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_READ_ALL)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_READ_ALL)
  async findOne(@Param('id') id: string) {
    return this.usersService.findByIdOrThrow(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_UPDATE_ALL)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put('profile')
  async updateProfile(@GetUser() user: any, @Body() updateData: UpdateUserDto) {
    return this.usersService.update(user.userId, updateData);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_UPDATE_ALL)
  async update(@Param('id') id: string, @Body() updateData: UpdateUserDto) {
    return this.usersService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_UPDATE_ALL)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':userId/roles/:roleId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_UPDATE_ALL)
  async addRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.usersService.addRole(userId, roleId);
  }

  @Delete(':userId/roles/:roleId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_UPDATE_ALL)
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.usersService.removeRole(userId, roleId);
  }

  @Post(':id/reset-password')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_UPDATE_ALL)
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    await this.usersService.updatePassword(id, body.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post(':id/toggle-active')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_UPDATE_ALL)
  async toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }
}