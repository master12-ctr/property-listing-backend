
import { Controller, Post, Body, Get, Param, Delete, Patch, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Permission } from '../shared/constants/permissions';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.PROPERTY_READ_OWN) // Regular users can contact property owners
  async create(
    @Body() createContactDto: CreateContactDto,
    @GetUser() user: any,
  ) {
    return this.contactService.createContact(createContactDto, user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getContacts(
    @GetUser() user: any,
    @Query('type') type: 'received' | 'sent' = 'received',
  ) {
    return this.contactService.getUserContacts(user.userId, type);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@GetUser() user: any) {
    const count = await this.contactService.getUnreadCount(user.userId);
    return { count };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.contactService.markAsRead(id, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    await this.contactService.deleteContact(id, user.userId);
    return { message: 'Contact deleted successfully' };
  }
}