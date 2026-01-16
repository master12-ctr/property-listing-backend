import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Put, 
  Param, 
  Delete, 
  UseGuards,
  Patch 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../shared/constants/permissions';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions(Permission.USER_READ_ALL)
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions(Permission.USER_READ_ALL)
  async findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Put(':id')
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Patch(':id/permissions/add')
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async addPermission(
    @Param('id') id: string,
    @Body('permission') permission: Permission,
  ) {
    return this.rolesService.addPermission(id, permission);
  }

  @Patch(':id/permissions/remove')
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async removePermission(
    @Param('id') id: string,
    @Body('permission') permission: Permission,
  ) {
    return this.rolesService.removePermission(id, permission);
  }
}