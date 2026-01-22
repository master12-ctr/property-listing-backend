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
  UseInterceptors,
  UploadedFiles,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PropertyCommands } from '../usecases/property/property.commands';
import { PropertyQueries } from '../usecases/property/property.queries';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../shared/constants/permissions';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { QueryPropertyDto } from '../dto/query-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PropertyImagesService } from '../services/property-images.service';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import { PropertyStatus } from '../domain/property/Property';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertyController {
  constructor(
    private readonly commands: PropertyCommands,
    private readonly queries: PropertyQueries,
     private readonly propertyImagesService: PropertyImagesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.PROPERTY_CREATE)
  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({ status: 201, description: 'Property created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
async create(
  @Body() createPropertyDto: CreatePropertyDto,
  @GetUser() user: any,
  @Request() req: any,
) {
  if (!req.tenantId) {
    throw new BadRequestException('Tenant ID is required');
  }
  
  // Validate coordinates if provided
  if (createPropertyDto.location.coordinates?.coordinates) {
    const [lng, lat] = createPropertyDto.location.coordinates.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new BadRequestException('Invalid coordinates. Longitude must be between -180 and 180, Latitude between -90 and 90');
    }
  }
  
  return this.commands.create(createPropertyDto, user.userId, req.tenantId);
}

  @Get()
@UseGuards(OptionalJwtAuthGuard) // Add this line
@ApiOperation({ summary: 'Get all properties with pagination and filtering' })

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived', 'disabled'] })
  @ApiQuery({ name: 'city', required: false, type: String, example: 'New York' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 1000 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 5000 })
  @ApiQuery({ name: 'type', required: false, enum: ['apartment', 'house', 'villa', 'commercial', 'land'] })
  @ApiQuery({ name: 'near', required: false, type: String, description: 'Coordinates: lng,lat (e.g., -73.935242,40.730610)' })
  @ApiQuery({ name: 'maxDistance', required: false, type: Number, description: 'Distance in meters (default: 5000)', example: 5000 })
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
  @ApiOperation({ summary: 'Get current user properties' })
  @ApiResponse({ status: 200, description: 'User properties retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @RequirePermissions(Permission.FAVORITE_READ)
  @ApiOperation({ summary: 'Get user favorite properties' })
  @ApiResponse({ status: 200, description: 'Favorite properties retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findFavorites(@GetUser() user: any, @Request() req: any) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.queries.findFavorites(user.userId, req.tenantId);
  }

@Get(':id')
@UseGuards(OptionalJwtAuthGuard)
@ApiOperation({ summary: 'Get property by ID' })
@ApiResponse({ status: 200, description: 'Property found' })
@ApiResponse({ status: 404, description: 'Property not found' })
async findOne(
  @Param('id') id: string,
  @GetUser() user: any,
  @Request() req: any,
) {
  const userId = user?.userId;
  const permissions = user?.permissions || [];
  const tenantId = req?.tenantId;
  
  // Increment views only if user is authenticated and property is published
  const property = await this.queries.findById(id, tenantId, userId, permissions);
  
  if (property && property.status === PropertyStatus.PUBLISHED && userId) {
    await this.queries.incrementViews(id, userId, tenantId);
  }
  
  return property;
}

  @Get(':id/validate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Validate property for publishing' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async validateForPublishing(
    @Param('id') id: string,
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.commands.validateForPublishing(id, req.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.PROPERTY_UPDATE_OWN, Permission.PROPERTY_UPDATE_ALL)
  @ApiOperation({ summary: 'Update property' })
  @ApiResponse({ status: 200, description: 'Property updated' })
  @ApiResponse({ status: 400, description: 'Cannot edit published property' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
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
  @RequirePermissions(Permission.PROPERTY_DELETE_OWN, Permission.PROPERTY_DELETE_ALL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete property' })
  @ApiResponse({ status: 204, description: 'Property deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
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
  @RequirePermissions(Permission.PROPERTY_PUBLISH)
  @ApiOperation({ summary: 'Publish property' })
  @ApiResponse({ status: 200, description: 'Property published' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
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
  @RequirePermissions(Permission.PROPERTY_ARCHIVE)
  @ApiOperation({ summary: 'Archive property' })
  @ApiResponse({ status: 200, description: 'Property archived' })
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
  @RequirePermissions(Permission.FAVORITE_CREATE)
  @ApiOperation({ summary: 'Add property to favorites' })
  @ApiResponse({ status: 200, description: 'Added to favorites' })
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
  @RequirePermissions(Permission.FAVORITE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove property from favorites' })
  @ApiResponse({ status: 204, description: 'Removed from favorites' })
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

  @Post(':id/disable')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.PROPERTY_UPDATE_ALL)
  @ApiOperation({ summary: 'Disable property (Admin only)' })
  @ApiResponse({ status: 200, description: 'Property disabled' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
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
  @RequirePermissions(Permission.PROPERTY_UPDATE_ALL)
  @ApiOperation({ summary: 'Enable property (Admin only)' })
  @ApiResponse({ status: 200, description: 'Property enabled' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
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

  @Get(':id/favorite/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.FAVORITE_READ)
  @ApiOperation({ summary: 'Check if property is favorited' })
  @ApiResponse({ status: 200, description: 'Favorite status retrieved' })
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


 
  

    @Post(':id/images')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.PROPERTY_UPDATE_OWN)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiOperation({ summary: 'Upload images for a property' })
  @ApiResponse({ status: 200, description: 'Images uploaded successfully' })
  async uploadPropertyImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const result = await this.propertyImagesService.uploadPropertyImages(
      id,
      files,
      user.userId,
      req.tenantId,
      user.permissions,
    );

    return { 
      success: true, 
      ...result,
      message: 'Images uploaded successfully'
    };
  }

  @Delete(':id/images')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.PROPERTY_UPDATE_OWN)
  @ApiOperation({ summary: 'Delete images from a property' })
  @ApiResponse({ status: 200, description: 'Images deleted successfully' })
  async deletePropertyImages(
    @Param('id') id: string,
    @Body() body: { urls: string[] },
    @GetUser() user: any,
    @Request() req: any,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      throw new BadRequestException('No image URLs provided');
    }

    await this.propertyImagesService.deletePropertyImages(
      id,
      body.urls,
      user.userId,
      req.tenantId,
      user.permissions,
    );

    return { 
      success: true, 
      message: 'Images deleted successfully',
      deletedCount: body.urls.length 
    };
  }
  

}