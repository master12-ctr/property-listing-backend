import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Permission } from '../shared/constants/permissions';
import { UsersService } from './users.service';

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
  @Permissions(Permission.USER_READ_ALL)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.USER_READ_ALL)
  async findOne(@Param('id') id: string) {
    return this.usersService.findByIdOrThrow(id);
  }

  @Put('profile')
  async updateProfile(@GetUser() user: any, @Body() updateData: any) {
    return this.usersService.update(user.userId, updateData);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.USER_UPDATE_ALL)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':userId/roles/:roleId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.USER_UPDATE_ALL)
  async addRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.usersService.addRole(userId, roleId);
  }

  @Delete(':userId/roles/:roleId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.USER_UPDATE_ALL)
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.usersService.removeRole(userId, roleId);
  }
}