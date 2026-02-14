import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserResponseDto } from '@pivota-api/dtos';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
// Pointing to your specific path
import { RolePermissionsMap } from '../configs/permissions.config'; 

/**
 * Represents an authenticated user, extending the base UserResponseDto
 * to include a single role from the JWT payload.
 */
interface AuthenticatedUser extends UserResponseDto {
  role?: string; 
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Bypass all auth logic for shared/website public views
    }

    // 2. Get required permissions from @Permissions() decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permission metadata is found, treat as "must be logged in"
    if (!requiredPermissions || requiredPermissions.length === 0) {
      const user = this.extractUser(context);
      if (!user) throw new UnauthorizedException('Authentication required');
      return true;
    }

    const user = this.extractUser(context);

    if (!user) {
      this.logger.warn('Access denied: Missing authenticated user in request context');
      throw new UnauthorizedException('User not authenticated');
    }

    const userRole = user.role;

    // Check against the imported config map (Zero DB overhead)
    if (!userRole || !RolePermissionsMap[userRole]) {
      this.logger.warn(`Access denied: Role "${userRole}" not found in permissions config`);
      throw new ForbiddenException('User has no valid permissions mapping');
    }

    const userPerms = RolePermissionsMap[userRole];

    // 3. Permission Logic
    // Access granted if user is SuperAdmin (*) OR role possesses ALL required permissions
    const hasPermission = 
      userPerms.includes('*') || 
      requiredPermissions.every(permission => userPerms.includes(permission));

    if (!hasPermission) {
      this.logger.warn(
        `Forbidden: User ${user.uuid} [${userRole}] lacks: [${requiredPermissions.join(', ')}]`
      );
      throw new ForbiddenException(
        `Insufficient permissions for this action.`,
      );
    }

    this.logger.debug(`Access granted: User ${user.uuid} | Role: ${userRole}`);
    return true;
  }

  /**
   * Safely extracts the authenticated user depending on transport type.
   */
  private extractUser(context: ExecutionContext): AuthenticatedUser | null {
    const type = context.getType<'http' | 'rpc' | 'ws'>();

    switch (type) {
      case 'http':
        return context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>().user ?? null;
      case 'rpc':
        return context.switchToRpc().getData<{ user?: AuthenticatedUser }>().user ?? null;
      case 'ws':
        return context.switchToWs().getClient<{ user?: AuthenticatedUser }>().user ?? null;
      default:
        return null;
    }
  }
}