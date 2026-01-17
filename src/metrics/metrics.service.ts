
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PropertyEntity, PropertyDocument } from '../properties/persistence/property/property.entity';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Contact, ContactDocument } from '../contact/schemas/contact.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';
import { PropertyStatus } from '../properties/domain/property/Property';


@Injectable()
export class MetricsService {
  constructor(
    @InjectModel(PropertyEntity.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async getSystemMetrics() {
    try {
      // Get role IDs first
      const [regularUserRole, propertyOwnerRole, adminRole] = await Promise.all([
        this.roleModel.findOne({ name: 'regular_user' }),
        this.roleModel.findOne({ name: 'property_owner' }),
        this.roleModel.findOne({ name: 'admin' }),
      ]);

      const [
        totalProperties,
        publishedProperties,
        draftProperties,
        archivedProperties,
        disabledProperties,
        totalUsers,
        regularUsers,
        propertyOwners,
        admins,
        totalContacts,
        unreadContacts,
        recentProperties,
        topViewedProperties,
        recentContacts,
        totalTenants,
        activeTenants,
      ] = await Promise.all([
        // Property counts
        this.propertyModel.countDocuments({ deletedAt: null }),
        this.propertyModel.countDocuments({ 
          status: PropertyStatus.PUBLISHED, 
          deletedAt: null 
        }),
        this.propertyModel.countDocuments({ 
          status: PropertyStatus.DRAFT, 
          deletedAt: null 
        }),
        this.propertyModel.countDocuments({ 
          status: PropertyStatus.ARCHIVED, 
          deletedAt: null 
        }),
        this.propertyModel.countDocuments({ 
          status: PropertyStatus.DISABLED, 
          deletedAt: null 
        }),
        
        // User counts
        this.userModel.countDocuments({ deletedAt: null }),
        regularUserRole ? this.userModel.countDocuments({ 
          roles: { $in: [regularUserRole._id] },
          deletedAt: null 
        }) : 0,
        propertyOwnerRole ? this.userModel.countDocuments({ 
          roles: { $in: [propertyOwnerRole._id] },
          deletedAt: null 
        }) : 0,
        adminRole ? this.userModel.countDocuments({ 
          roles: { $in: [adminRole._id] },
          deletedAt: null 
        }) : 0,
        
        // Contact counts
        this.contactModel.countDocuments({ deletedAt: null }),
        this.contactModel.countDocuments({ 
          isRead: false,
          deletedAt: null 
        }),
        
        // Recent data
        this.propertyModel
          .find({ deletedAt: null })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('owner', 'name email')
          .populate('tenant', 'name slug')
          .exec(),
        
        this.propertyModel
          .find({ deletedAt: null })
          .sort({ views: -1 })
          .limit(5)
          .populate('owner', 'name email')
          .populate('tenant', 'name slug')
          .exec(),
        
        this.contactModel
          .find({ deletedAt: null })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('property', 'title')
          .populate('fromUser', 'name email')
          .populate('toUser', 'name email')
          .exec(),
        
        // Tenant counts
        this.tenantModel.countDocuments({ deletedAt: null }),
        this.tenantModel.countDocuments({ 
          isActive: true, 
          deletedAt: null 
        }),
      ]);

      return {
        summary: {
          tenants: {
            total: totalTenants,
            active: activeTenants,
          },
          properties: {
            total: totalProperties,
            published: publishedProperties,
            draft: draftProperties,
            archived: archivedProperties,
            disabled: disabledProperties,
          },
          users: {
            total: totalUsers,
            regular: regularUsers,
            owners: propertyOwners,
            admins: admins,
          },
          contacts: {
            total: totalContacts,
            unread: unreadContacts,
          },
        },
        recentActivity: {
          recentProperties: recentProperties.map(prop => ({
            id: prop._id,
            title: prop.title,
            status: prop.status,
            createdAt: prop.createdAt,
            owner: prop.owner,
            tenant: prop.tenant,
          })),
          topViewedProperties: topViewedProperties.map(prop => ({
            id: prop._id,
            title: prop.title,
            views: prop.views,
            favoritesCount: prop.favoritesCount,
          })),
          recentContacts: recentContacts.map(contact => ({
            id: contact._id,
            property: contact.property,
            fromUser: contact.fromUser,
            toUser: contact.toUser,
            message: contact.message?.substring(0, 100) + '...',
            createdAt: contact.createdAt,
          })),
        },
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw new BadRequestException('Failed to get system metrics');
    }
  }

  async getPropertyMetrics(timeRange: 'day' | 'week' | 'month' = 'week') {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const [
        propertiesCreated,
        propertiesPublished,
        propertiesViewedAgg,
        totalFavoritesAgg,
      ] = await Promise.all([
        this.propertyModel.countDocuments({
          createdAt: { $gte: startDate },
          deletedAt: null,
        }),
        this.propertyModel.countDocuments({
          publishedAt: { $gte: startDate },
          deletedAt: null,
        }),
        this.propertyModel.aggregate([
          {
            $match: {
              deletedAt: null,
              status: PropertyStatus.PUBLISHED,
            }
          },
          {
            $group: {
              _id: null,
              totalViews: { $sum: '$views' }
            }
          }
        ]),
        this.propertyModel.aggregate([
          {
            $match: {
              deletedAt: null,
              status: PropertyStatus.PUBLISHED,
            }
          },
          {
            $group: {
              _id: null,
              totalFavorites: { $sum: '$favoritesCount' }
            }
          }
        ]),
      ]);

      return {
        timeRange,
        period: { start: startDate, end: now },
        metrics: {
          propertiesCreated,
          propertiesPublished,
          totalViews: propertiesViewedAgg[0]?.totalViews || 0,
          totalFavorites: totalFavoritesAgg[0]?.totalFavorites || 0,
        },
      };
    } catch (error) {
      console.error('Error getting property metrics:', error);
      throw new BadRequestException('Failed to get property metrics');
    }
  }

  async getTenantMetrics(tenantId: string): Promise<any> {
  try {
    const tenantObjectId = new Types.ObjectId(tenantId);
    
    const [
      totalProperties,
      publishedProperties,
      draftProperties,
      archivedProperties,
      disabledProperties,
      totalUsers,
      totalContacts,
      recentProperties,
      topViewedProperties,
    ] = await Promise.all([
      // Property counts
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        deletedAt: null 
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.PUBLISHED, 
        deletedAt: null 
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.DRAFT, 
        deletedAt: null 
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.ARCHIVED, 
        deletedAt: null 
      }),
      this.propertyModel.countDocuments({ 
        tenant: tenantObjectId,
        status: PropertyStatus.DISABLED, 
        deletedAt: null 
      }),
      
      // User count for this tenant
      this.userModel.countDocuments({ 
        tenant: tenantObjectId,
        deletedAt: null 
      }),
      
      // Contact count for this tenant's properties
      this.contactModel.countDocuments({ deletedAt: null }),
      
      // Recent data
      this.propertyModel
        .find({ 
          tenant: tenantObjectId,
          deletedAt: null 
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('owner', 'name email')
        .exec(),
      
      this.propertyModel
        .find({ 
          tenant: tenantObjectId,
          deletedAt: null,
          status: PropertyStatus.PUBLISHED 
        })
        .sort({ views: -1 })
        .limit(5)
        .populate('owner', 'name email')
        .exec(),
    ]);

    return {
      tenantId,
      summary: {
        properties: {
          total: totalProperties,
          published: publishedProperties,
          draft: draftProperties,
          archived: archivedProperties,
          disabled: disabledProperties,
        },
        users: {
          total: totalUsers,
        },
        contacts: {
          total: totalContacts,
        },
      },
      recentActivity: {
        recentProperties: recentProperties.map(prop => ({
          id: prop._id.toString(),
          title: prop.title,
          status: prop.status,
          views: prop.views,
          createdAt: prop.createdAt,
          owner: {
            id: (prop.owner as any)._id.toString(),
            name: (prop.owner as any).name,
          },
        })),
        topViewedProperties: topViewedProperties.map(prop => ({
          id: prop._id.toString(),
          title: prop.title,
          views: prop.views,
          favoritesCount: prop.favoritesCount,
          status: prop.status,
        })),
      },
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error getting tenant metrics:', error);
    throw new BadRequestException('Failed to get tenant metrics');
  }
}
}