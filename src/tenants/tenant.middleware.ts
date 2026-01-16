// ./tenants/tenant.middleware.ts
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
    // Try to get tenant from multiple sources
    const tenantIdentifier = 
      req.headers['x-tenant-id'] || 
      req.headers['tenant-id'] ||
      req.query.tenant ||
      req.subdomains[0]; // For subdomain multi-tenancy

    if (tenantIdentifier) {
      try {
        let tenant: TenantDocument | null = null;
        
        // Check if identifier is a valid ObjectId
        if (Types.ObjectId.isValid(tenantIdentifier as string)) {
          tenant = await this.tenantModel.findOne({
            _id: new Types.ObjectId(tenantIdentifier as string),
            isActive: true,
            deletedAt: null,
          });
        } else {
          // Try as slug
          tenant = await this.tenantModel.findOne({
            slug: tenantIdentifier as string,
            isActive: true,
            deletedAt: null,
          });
        }

        if (tenant) {
          req.tenant = tenant;
          req.tenantId = tenant._id.toString();
        } else {
          console.warn(`Tenant not found for identifier: ${tenantIdentifier}`);
        }
      } catch (error) {
        console.error('Tenant middleware error:', error);
      }
    }

    next();
  }
}