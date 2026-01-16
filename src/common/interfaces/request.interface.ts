
import { Request } from 'express';
import { TenantDocument } from '../../tenants/schemas/tenant.schema';

export interface IRequestWithTenant extends Request {
  tenant?: TenantDocument;
  tenantId?: string;
}