import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { IRequestWithTenant } from '../common/interfaces/request.interface';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async use(req: IRequestWithTenant, res: Response, next: NextFunction) {
    // Try multiple tenant identification methods
    const tenantIdentifier = 
      req.headers['x-tenant-id']?.toString() || 
      req.headers['tenant-id']?.toString() ||
      req.query.tenant?.toString() ||
      req.subdomains[0] || // Subdomain multi-tenancy
      'main'; // Default tenant

    try {
      let tenant: TenantDocument | null = null;
      
      if (Types.ObjectId.isValid(tenantIdentifier)) {
        tenant = await this.tenantModel.findOne({
          _id: new Types.ObjectId(tenantIdentifier),
          isActive: true,
          deletedAt: null,
        });
      } else {
        tenant = await this.tenantModel.findOne({
          slug: tenantIdentifier,
          isActive: true,
          deletedAt: null,
        });
      }

      if (!tenant) {
        // If tenant not found, use default tenant
        tenant = await this.tenantModel.findOne({
          slug: 'main',
          isActive: true,
          deletedAt: null,
        });
      }

      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenant._id.toString();
        
        // Set tenant context for all downstream services
        res.setHeader('X-Tenant-ID', tenant._id.toString());
        res.setHeader('X-Tenant-Name', tenant.name);
      }
    } catch (error) {
      console.error('Tenant middleware error:', error);
      // Continue without tenant context
    }

    next();
  }
}