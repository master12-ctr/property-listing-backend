
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Put, 
  Param, 
  Delete, 
  UseGuards,
  Query 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Permission } from '../shared/constants/permissions';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    // Users can only view their own tenant unless admin
    const tenant = await this.tenantsService.findById(id);
    const isAdmin = user.permissions.includes(Permission.SYSTEM_CONFIG_UPDATE);
    
    if (!isAdmin && user.tenantId !== tenant._id.toString()) {
      throw new Error('Insufficient permissions');
    }
    
    return tenant;
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async create(@Body() tenantData: any, @GetUser() user: any) {
    return this.tenantsService.create({
      ...tenantData,
      owner: user.userId,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.tenantsService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_CONFIG_UPDATE)
  async remove(@Param('id') id: string) {
    await this.tenantsService.remove(id);
    return { message: 'Tenant deleted successfully' };
  }
}