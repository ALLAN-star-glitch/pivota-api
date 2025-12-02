import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@pivota-api/decorators';
import { Request } from 'express';
import { UserResponseDto } from '@pivota-api/dtos';

/**
 * Represents an authenticated user, extending the base UserResponseDto
 * to include a single role.
 */
interface AuthenticatedUser extends UserResponseDto {
  role?: string; // Single role per user
}

/**
 * Guard that checks if a user has the required role(s)
 * defined by the @Roles() decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role restriction
    }

    const user = this.extractUser(context);

    if (!user) {
      this.logger.warn('Access denied: Missing authenticated user in request context');
      throw new UnauthorizedException('User not authenticated');
    }


    const userRole = user.role ?? null;

    if (!userRole) {
      this.logger.warn(`Access denied: User ${user.userCode || user.id || 'unknown'} has no role`);
      throw new ForbiddenException('No role assigned to user');
    }

    // Check if user's role matches any required role
    if (!requiredRoles.includes(userRole)) {
      this.logger.warn(
        `Access denied for user ${user.userCode || user.id || 'unknown'} | User role: ${userRole} | Required: [${requiredRoles.join(
          ', ',
        )}]`,
      );
      throw new ForbiddenException(
        `You do not have permission to perform this action (required: ${requiredRoles.join(', ')})`,
      );
    }

    this.logger.debug(
      ` Access granted for user ${user.userCode || user.id || 'unknown'} with role: ${userRole}`,
    );

    return true;
  }

  /**
   * Safely extracts the authenticated user depending on transport type.
   */
  private extractUser(context: ExecutionContext): AuthenticatedUser | null {
    const type = context.getType<'http' | 'rpc' | 'ws'>();

    switch (type) {
      case 'http': {
        const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
        return request.user ?? null;
      }

      case 'rpc': {
        const rpcData = context.switchToRpc().getData<{ user?: AuthenticatedUser }>();
        return rpcData?.user ?? null;
      }

      case 'ws': {
        const wsClient = context.switchToWs().getClient<{ user?: AuthenticatedUser }>();
        return wsClient?.user ?? null;
      }

      default:
        return null;
    }
  }
}
