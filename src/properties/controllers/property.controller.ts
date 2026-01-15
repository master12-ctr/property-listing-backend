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
  ) {
    return this.commands.create(createPropertyDto, user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: QueryPropertyDto,
    @GetUser() user: any,
  ) {
    return this.queries.findAll(query, user.userId, user.permissions);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyProperties(
    @Query('status') status: string,
    @GetUser() user: any,
  ) {
    return this.queries.findByOwner(user.userId, user.userId, user.permissions, status);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.FAVORITE_READ)
  async findFavorites(@GetUser() user: any) {
    return this.queries.findFavorites(user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.queries.findById(id, user.userId, user.permissions);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_UPDATE_OWN, Permission.PROPERTY_UPDATE_ALL)
  async update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @GetUser() user: any,
  ) {
    return this.commands.update(id, updatePropertyDto, user.userId, user.permissions);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_DELETE_OWN, Permission.PROPERTY_DELETE_ALL)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    await this.commands.delete(id, user.userId, user.permissions);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_PUBLISH)
  async publish(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.commands.publish(id, user.userId);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_ARCHIVE)
  async archive(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.commands.archive(id, user.userId);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.FAVORITE_CREATE)
  async addFavorite(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.commands.addToFavorites(id, user.userId);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.FAVORITE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    await this.commands.removeFromFavorites(id, user.userId);
  }

  @Get('metrics/summary')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.SYSTEM_METRICS_READ)
  async getMetrics(@GetUser() user: any) {
    return this.queries.getMetrics(user.permissions);
  }
}