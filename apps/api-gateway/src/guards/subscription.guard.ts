import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsGatewayService } from '../gateway-modules/SubscriptionsGatewayModule/subscriptions-gateway.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  // Administrative roles that bypass subscription constraints
  private readonly ADMIN_ROLES = ['SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin'];

  constructor(
    private readonly reflector: Reflector,
    private readonly subService: SubscriptionsGatewayService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. ADMIN BYPASS
    // System administrators are exempt from commercial plan restrictions.
    if (user && this.ADMIN_ROLES.includes(user.role)) {
      this.logger.debug(`Admin bypass triggered for role: ${user.role}`);
      
    
      // We still attach a "Unlimited" object so downstream Aggregators don't break
      request['subscriptionRestrictions'] = {
        jobLimit: -1,
        listingLimit: -1,
        canExport: true,
      };
      return true;
    }

    // 2. MODULE IDENTIFICATION
    const moduleSlug = this.reflector.get<string>('module', context.getHandler());
    if (!moduleSlug) return true;

    const accountId = user?.accountId;
    if (!accountId) {
      throw new ForbiddenException('User account context not found');
    }

    // 3. PLAN VERIFICATION (gRPC)
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          this.logger.error('Failed to parse restrictions string');
          restrictions = {};
        }
      }
      
      request['subscriptionRestrictions'] = restrictions;
      return true;

    } catch (error) {
      // If it's already a ForbiddenException (from our logic), rethrow it
      if (error instanceof ForbiddenException) throw error;
      
      this.logger.error(`Subscription check failed: ${error.message}`);
      // Fail-closed: block request if the subscription service is unreachable
      throw new ForbiddenException('Subscription status could not be verified.');
    }
  }
}