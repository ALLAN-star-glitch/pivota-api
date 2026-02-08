import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AccessDataDto,
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto
} from '@pivota-api/dtos';
import { PricingService } from './pricing.service';

interface PrismaPlanModule {
  id: string;
  restrictions: unknown; // Use unknown instead of any
}

interface PrismaSubscriptionWithPlan {
  id: string;
  plan: {
    name: string;
    planModules: PrismaPlanModule[];
  } | null;
}
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  // ---------------------------------------------------------
  // Subscribe to Plan
  // ---------------------------------------------------------
  async subscribeToPlan(
    dto: SubscribeToPlanDto
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    try {
      this.logger.debug(`Subscribing Account ${dto.subscriberUuid} to plan ${dto.planId}`);

      const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan) {
        return {
          success: false,
          message: 'Invalid plan',
          code: 'PLAN_NOT_FOUND',
          subscription: null,
          error: { message: 'Plan does not exist' },
        } as unknown as BaseResponseDto<SubscriptionResponseDto>;
      }

      const features = JSON.parse(plan.features as string) as Record<string, Record<string, number>>;

      const activePlan = await this.prisma.subscription.findFirst({
        where: {
          accountUuid: dto.subscriberUuid,
          type: 'PLAN',
          status: 'ACTIVE',
        },
      });

      if (activePlan) {
        return {
          success: false,
          message: 'Account already has an active recurring plan',
          code: 'PLAN_ALREADY_ACTIVE',
          subscription: null,
          error: { message: 'Cannot subscribe to multiple active recurring plans' },
        } as unknown as BaseResponseDto<SubscriptionResponseDto>;
      }

      const quote = this.pricingService.calculateQuote(
        { isPremium: plan.isPremium },
        { prices: features.prices || {} },
        dto.billingCycle,
        dto.amountPaid ?? 0
      );

      const subscription = await this.prisma.subscription.create({
        data: {
          accountUuid: dto.subscriberUuid,
          planId: plan.id,
          type: 'PLAN',
          entityIds: dto.entityIds ?? [],
          status: quote.status,
          billingCycle: quote.billingCycle,
          totalAmount: quote.totalAmount,
          amountPaid: quote.amountPaid,
          currency: dto.currency ?? 'KES',
          startedAt: new Date(),
          expiresAt: quote.expiresAt,
        },
        include: { plan: true },
      });

      return {
        success: true,
        message: 'Subscription created successfully',
        code: 'SUBSCRIPTION_CREATED',
        subscription: {
          id: subscription.id,
          subscriberUuid: subscription.accountUuid,
          plan: subscription.plan.name,
          type: subscription.type as 'PLAN' | 'PAYGO',
          entityIds: subscription.entityIds ?? [],
          status: subscription.status as 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PARTIALLY_PAID',
          billingCycle: (subscription.billingCycle || 'monthly') as 'monthly' | 'quarterly' | 'halfYearly' | 'annually',
          totalAmount: subscription.totalAmount,
          amountPaid: subscription.amountPaid,
          currency: subscription.currency,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        },
        error: null,
      } as unknown as BaseResponseDto<SubscriptionResponseDto>;
      
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to subscribe: ${error.message}`);
      return {
        success: false,
        message: 'Failed to subscribe',
        code: 'SUBSCRIPTION_FAILED',
        subscription: null,
        error: { message: error.message, details: error.stack },
      } as unknown as BaseResponseDto<SubscriptionResponseDto>;
    }
  }

  // ---------------------------------------------------------
  // GET ACTIVE SUBSCRIPTIONS BY ACCOUNT
  // ---------------------------------------------------------
  async getSubscriptionsByAccount(
    accountUuid: string
  ): Promise<BaseResponseDto<SubscriptionResponseDto[]>> {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
        where: { accountUuid, status: 'ACTIVE' },
        include: { plan: true },
      });

      if (!subscriptions || subscriptions.length === 0) {
        return {
          success: false,
          message: 'No active subscriptions found',
          code: 'SUBSCRIPTIONS_NOT_FOUND',
          subscriptions: null,
          error: { message: 'No active subscriptions for this account' },
        } as unknown as BaseResponseDto<SubscriptionResponseDto[]>;
      }

      const results = subscriptions.map((sub) => ({
        id: sub.id,
        subscriberUuid: sub.accountUuid,
        plan: sub.plan.name,
        type: sub.type as 'PLAN' | 'PAYGO',
        status: sub.status as 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PARTIALLY_PAID',
        billingCycle: (sub.billingCycle || 'monthly') as 'monthly' | 'quarterly' | 'halfYearly' | 'annually',
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        entityIds: sub.entityIds ?? [],
        totalAmount: sub.totalAmount,
        amountPaid: sub.amountPaid,
        currency: sub.currency,
      }));

      return {
        success: true,
        message: 'Subscriptions retrieved successfully',
        code: 'FETCHED',
        subscriptions: results,
        error: null,
      } as unknown as BaseResponseDto<SubscriptionResponseDto[]>;

    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        message: 'Failed to fetch subscriptions',
        code: 'FETCH_SUBSCRIPTIONS_FAILED',
        subscriptions: null,
        error: { message: error.message, details: error.stack },
      } as unknown as BaseResponseDto<SubscriptionResponseDto[]>;
    }
  }

  // ---------------------------------------------------------
  // CHECK MODULE ACCESS
  // ---------------------------------------------------------
  // 1. Define local interfaces for the Prisma result structure


// ... inside SubscriptionService class

async checkModuleAccess(
  accountUuid: string,
  moduleSlug: string
): Promise<BaseResponseDto<AccessDataDto>> {
  try {
    this.logger.debug(`Checking access: Account=${accountUuid}, Module=${moduleSlug}`);

    // 2. Perform the query with specific typing
    const activeSub = (await this.prisma.subscription.findFirst({
      where: { accountUuid, status: 'ACTIVE' },
      include: {
        plan: {
          include: {
            planModules: {
              where: { module: { slug: moduleSlug } },
            },
          },
        },
      },
    })) as PrismaSubscriptionWithPlan | null;

    // 3. Use Guard Clauses for safety
    if (!activeSub || !activeSub.plan) {
      return {
        success: true,
        code: 'PLAN_UPGRADE_REQUIRED',
        message: 'No active subscription found.',
        data: { 
          isAllowed: false, 
          restrictions: JSON.stringify({ isAllowed: false }), 
          reason: 'NO_ACTIVE_SUBSCRIPTION' 
        },
      } as unknown as BaseResponseDto<AccessDataDto>;
    }

    const moduleConfig = activeSub.plan.planModules[0];
    if (!moduleConfig) {
      return {
        success: true,
        code: 'MODULE_NOT_IN_PLAN',
        message: `Module ${moduleSlug} not included in ${activeSub.plan.name}.`,
        data: { 
          isAllowed: false, 
          restrictions: JSON.stringify({ isAllowed: false }), 
          reason: 'MODULE_NOT_IN_PLAN' 
        },
      } as unknown as BaseResponseDto<AccessDataDto>;
    }

    // 4. Safely parse restrictions using unknown/type-checks
    let isAllowed = false;
    let restrictionsStr = '{}';

    if (typeof moduleConfig.restrictions === 'string') {
      restrictionsStr = moduleConfig.restrictions;
      const parsed = JSON.parse(restrictionsStr) as Record<string, unknown>;
      isAllowed = parsed.isAllowed === true;
    } else if (moduleConfig.restrictions && typeof moduleConfig.restrictions === 'object') {
      const parsed = moduleConfig.restrictions as Record<string, unknown>;
      isAllowed = parsed.isAllowed === true;
      restrictionsStr = JSON.stringify(parsed);
    }

    this.logger.debug(`Access check result for Account=${accountUuid}, Module=${moduleSlug}: isAllowed=${isAllowed}, restrictions=${restrictionsStr}`); 
    this.logger.debug(`Full moduleConfig: ${JSON.stringify(moduleConfig)}`);
    return {
      success: true,
      code: isAllowed ? 'ACCESS_GRANTED' : 'PLAN_UPGRADE_REQUIRED',
      message: isAllowed ? 'Access granted.' : 'Upgrade required.',
      data: {
        isAllowed,
        restrictions: restrictionsStr,
      },
      
    } as unknown as BaseResponseDto<AccessDataDto>;

  } catch (err: unknown) {
    const error = err as Error;
    this.logger.error(`CheckModuleAccess Error: ${error.message}`);
    return {
      success: false,
      code: 'ACCESS_CHECK_ERROR',
      message: 'Internal error during access check.',
      data: { isAllowed: false, restrictions: '{}', reason: 'INTERNAL_ERROR' },
    } as unknown as BaseResponseDto<AccessDataDto>;
  }
}
}