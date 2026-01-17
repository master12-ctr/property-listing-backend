import { Types } from 'mongoose';
import { Permission } from '../../shared/constants/permissions';

export interface JwtPayload {
  email: string;
  sub: string;
  permissions: Permission[];
  tenantId: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  permissions: Permission[];
  tenantId?: string;
}

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Coordinates {
  lng: number;
  lat: number;
}