// apps/gateway/src/guards/permissions.guard.ts

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
// Remove MODULE_KEY import - it's not used in this guard
import { hasPermission, RoleType } from '@pivota-api/access-management';

/**
 * Represents an authenticated user
 */
interface AuthenticatedUser extends UserResponseDto {
  role?: RoleType;
  accountId: string;
}

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
      return true; // Bypass all auth logic for public endpoints
    }

    // 2. Get user from request
    const user = this.extractUser(context);
    if (!user) {
      this.logger.warn('Access denied: Missing authenticated user');
      throw new UnauthorizedException('Authentication required');
    }

    // 3. Check required permissions from @Permissions() decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific permissions required, just being logged in is enough
    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.debug(`Access granted: User ${user.uuid} [${user.role}] - no permissions required`);
      return true;
    }

    const userRole = user.role;

    if (!userRole) {
      this.logger.warn(`Access denied: User ${user.uuid} has no role assigned`);
      throw new ForbiddenException('User has no valid role');
    }

    // Check each required permission using the shared hasPermission function
    for (const permission of requiredPermissions) {
      const hasPerm = hasPermission(userRole, permission);
      
      if (!hasPerm) {
        this.logger.warn(
          `Forbidden: User ${user.uuid} [${userRole}] lacks permission: ${permission}`
        );
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${permission}`
        );
      }
    }

    this.logger.debug(
      `Access granted: User ${user.uuid} [${userRole}] | Permissions: [${requiredPermissions.join(', ')}]`
    );
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