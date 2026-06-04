import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hasPermission, RoleType } from '@pivota-api/access-management';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      this.logger.warn('Access denied: Missing authenticated user');
      throw new UnauthorizedException('Authentication required');
    }

    // 3. Get user ID - try all possible field names
    const userId = user.userUuid || user.sub || user.uuid || user.id || 'unknown';
    const userRole = user.role as RoleType; // ✅ Using RoleType for type safety

    // 4. Check required permissions
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific permissions required, just being logged in is enough
    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.debug(`Access granted: User ${userId} [${userRole}] - no permissions required`);
      return true;
    }

    if (!userRole) {
      this.logger.warn(`Access denied: User ${userId} has no role assigned`);
      throw new ForbiddenException('User has no valid role');
    }

    // Check each required permission
    for (const permission of requiredPermissions) {
      const hasPerm = hasPermission(userRole, permission); // ✅ Now passing RoleType
      
      if (!hasPerm) {
        this.logger.warn(
          `Forbidden: User ${userId} [${userRole}] lacks permission: ${permission}`
        );
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${permission}`
        );
      }
    }

    this.logger.debug(
      `Access granted: User ${userId} [${userRole}] | Permissions: [${requiredPermissions.join(', ')}]`
    );
    return true;
  }
}