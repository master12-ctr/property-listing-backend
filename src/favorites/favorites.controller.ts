import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../shared/constants/permissions';
import { FavoritesService } from './favorites.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('favorites')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':propertyId')
  @Permissions(Permission.FAVORITE_CREATE)
  async addFavorite(
    @Param('propertyId') propertyId: string,
    @GetUser() user: any,
  ) {
    return this.favoritesService.addToFavorites(propertyId, user.userId);
  }

  @Delete(':propertyId')
  @Permissions(Permission.FAVORITE_DELETE)
  async removeFavorite(
    @Param('propertyId') propertyId: string,
    @GetUser() user: any,
  ) {
    return this.favoritesService.removeFromFavorites(propertyId, user.userId);
  }

  @Get()
  @Permissions(Permission.FAVORITE_READ)
  async getFavorites(@GetUser() user: any) {
    return this.favoritesService.getUserFavorites(user.userId);
  }

  @Get(':propertyId/status')
  @Permissions(Permission.FAVORITE_READ)
  async getFavoriteStatus(
    @Param('propertyId') propertyId: string,
    @GetUser() user: any,
  ) {
    const isFavorited = await this.favoritesService.isPropertyFavorited(propertyId, user.userId);
    return { isFavorited };
  }
}