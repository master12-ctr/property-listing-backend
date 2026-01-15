import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../../shared/constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      user.permissions?.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

// Combined guard for JWT + Permissions
@Injectable()
export class JwtPermissionsGuard implements CanActivate {
  constructor(
    private jwtAuthGuard: JwtAuthGuard,
    private permissionsGuard: PermissionsGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check JWT authentication
    const canActivateJwt = await this.jwtAuthGuard.canActivate(context);
    if (!canActivateJwt) {
      return false;
    }

    // Then check permissions
    return this.permissionsGuard.canActivate(context);
  }
}