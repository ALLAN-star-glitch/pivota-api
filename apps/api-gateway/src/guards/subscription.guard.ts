// apps/gateway/src/guards/subscription.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsGatewayService } from '../gateway-modules/SubscriptionsGatewayModule/subscriptions-gateway.service';
import { MODULE_KEY } from '../decorators/set-module.decorator';
import { isPlatformRole } from '@pivota-api/access-management';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly subService: SubscriptionsGatewayService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. ADMIN BYPASS - Platform roles bypass subscription restrictions
    if (user && isPlatformRole(user.role)) {
      this.logger.debug(`Admin bypass triggered for role: ${user.role}`);
      
      request['subscriptionRestrictions'] = {
        jobLimit: -1,
        listingLimit: -1,
        canExport: true,
      };
      return true;
    }

    // 2. MODULE IDENTIFICATION
    const moduleSlug = this.reflector.get<string>(MODULE_KEY, context.getHandler());
    if (!moduleSlug) return true;

    // Use accountId (the account that owns the subscription)
    // For individuals: accountId = their personal account UUID
    // For business members: accountId = the business account UUID
    const accountId = user?.accountId;
    if (!accountId) {
      this.logger.warn('No accountId found for user');
      throw new ForbiddenException('User account context not found');
    }

    // 3. PLAN VERIFICATION (gRPC) - Pass accountId as the accountUuid
    try {
      const response = await this.subService.checkModuleAccess(accountId, moduleSlug);

      if (!response.success || !response.data?.isAllowed) {
        this.logger.warn(`Access Denied: Account ${accountId} lacks access to ${moduleSlug}`);
        throw new ForbiddenException(
          response.data?.reason || 'Your current plan does not include this feature.'
        );
      }

      // 4. ATTACH RESTRICTIONS
      let restrictions = response.data.restrictions;
      if (typeof restrictions === 'string') {
        try {
          restrictions = JSON.parse(restrictions);
        } catch (e) {
          this.logger.error('Failed to parse restrictions string');
          restrictions = {};
        }
      }
      
      request['subscriptionRestrictions'] = restrictions;
      return true;

    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      
      this.logger.error(`Subscription check failed: ${error.message}`);
      throw new ForbiddenException('Subscription status could not be verified.');
    }
  }
}