
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UsersService } from '../users/users.service';
import { PropertyRepository } from '../properties/persistence/property/property.repository';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    private usersService: UsersService,
    private propertyRepository: PropertyRepository,
  ) {}

  async createContact(createContactDto: CreateContactDto, fromUserId: string): Promise<ContactDocument> {
    // Get the property to find the owner
    const property = await this.propertyRepository.findById(createContactDto.propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check if property is published
    if (property.status !== 'published') {
      throw new NotFoundException('Property is not available for contact');
    }

    // Get property owner
    const ownerId = property.ownerId;

    // Create contact message
    const contact = new this.contactModel({
      property: new Types.ObjectId(createContactDto.propertyId),
      fromUser: new Types.ObjectId(fromUserId),
      toUser: new Types.ObjectId(ownerId),
      name: createContactDto.name,
      email: createContactDto.email,
      phone: createContactDto.phone,
      message: createContactDto.message,
    });

    return contact.save();
  }

  async getUserContacts(userId: string, type: 'received' | 'sent' = 'received'): Promise<ContactDocument[]> {
    const query = type === 'received' 
      ? { toUser: new Types.ObjectId(userId), deletedAt: null }
      : { fromUser: new Types.ObjectId(userId), deletedAt: null };

    return this.contactModel
      .find(query)
      .populate('property', 'title images location')
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(contactId: string, userId: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findOneAndUpdate(
      { 
        _id: contactId, 
        toUser: new Types.ObjectId(userId),
        isRead: false 
      },
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!contact) {
      throw new NotFoundException('Contact not found or already read');
    }

    return contact;
  }

  async deleteContact(contactId: string, userId: string): Promise<void> {
    const contact = await this.contactModel.findOne({
      _id: contactId,
      $or: [
        { fromUser: new Types.ObjectId(userId) },
        { toUser: new Types.ObjectId(userId) }
      ]
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    contact.deletedAt = new Date();
    await contact.save();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.contactModel.countDocuments({
      toUser: new Types.ObjectId(userId),
      isRead: false,
      deletedAt: null
    });
  }
}