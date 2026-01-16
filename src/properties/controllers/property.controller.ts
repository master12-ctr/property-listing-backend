import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { PropertyCommands } from '../usecases/property/property.commands';
import { PropertyQueries } from '../usecases/property/property.queries';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../shared/constants/permissions';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { QueryPropertyDto } from '../dto/query-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { MetricsPropertyDto } from '../dto/metrics-property.dto';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly commands: PropertyCommands,
    private readonly queries: PropertyQueries,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_CREATE)
  async create(
    @Body() createPropertyDto: CreatePropertyDto,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.create(createPropertyDto, user.userId, req.tenantId);
  }

  @Get()
  async findAll(
    @Query() query: QueryPropertyDto,
    @GetUser() user?: any,
    @Request() req?: any,
  ) {
    const userId = user?.userId;
    const permissions = user?.permissions || [];
    const tenantId = req?.tenantId;
    
    return this.queries.findAll(query, tenantId, userId, permissions);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyProperties(
    @Query('status') status: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.queries.findByOwner(user.userId, req.tenantId, status);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.FAVORITE_READ)
  async findFavorites(@GetUser() user: any, @Request() req: any) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.queries.findFavorites(user.userId, req.tenantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetUser() user?: any,
    @Request() req?: any,
  ) {
    const userId = user?.userId;
    const permissions = user?.permissions || [];
    const tenantId = req?.tenantId;
    
    // Increment view count (optional, can be moved to middleware)
    await this.queries.incrementViews(id, tenantId);
    
    return this.queries.findById(id, tenantId, userId, permissions);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_UPDATE_OWN, Permission.PROPERTY_UPDATE_ALL)
  async update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.update(
      id,
      updatePropertyDto,
      user.userId,
      req.tenantId,
      user.permissions,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_DELETE_OWN, Permission.PROPERTY_DELETE_ALL)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    await this.commands.delete(id, user.userId, req.tenantId, user.permissions);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_PUBLISH)
  async publish(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.publish(id, user.userId, req.tenantId);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_ARCHIVE)
  async archive(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.archive(id, user.userId, req.tenantId);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.FAVORITE_CREATE)
  async addFavorite(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.addToFavorites(id, user.userId, req.tenantId);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.FAVORITE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    await this.commands.removeFromFavorites(id, user.userId, req.tenantId);
  }

  @Get('metrics/summary')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_METRICS_READ)
  async getMetrics(@GetUser() user: any) {
    return this.queries.getMetrics(user.permissions);
  }

  @Post(':id/disable')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_UPDATE_ALL)
  async disable(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.disable(
      id,
      user.userId,
      req.tenantId,
      user.permissions,
    );
  }

  @Post(':id/enable')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_UPDATE_ALL)
  async enable(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.enable(
      id,
      user.userId,
      req.tenantId,
      user.permissions,
    );
  }

  @Get('metrics/property')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_METRICS_READ)
  async getPropertyMetrics(
    @Query() metricsDto: MetricsPropertyDto,
    @GetUser() user: any,
  ) {
    return this.queries.getPropertyMetrics(metricsDto.timeRange);
  }

  @Get('admin/metrics/tenant')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_METRICS_READ)
  async getTenantMetrics(@GetUser() user: any, @Request() req: any) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.queries.getTenantMetrics(req.tenantId);
  }

  @Get(':id/favorite/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.FAVORITE_READ)
  async getFavoriteStatus(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const isFavorited = await this.queries.isFavorited(
      id,
      user.userId,
      req.tenantId,
    );
    return { isFavorited };
  }

  @Get(':id/view')
  async incrementView(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const tenantId = req?.tenantId;
    await this.queries.incrementViews(id, tenantId);
    return { success: true, message: 'View count incremented' };
  }
}