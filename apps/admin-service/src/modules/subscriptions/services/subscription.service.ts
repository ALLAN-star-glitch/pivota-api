import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';


import {
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto
} from '@pivota-api/dtos';


type PlanPrices = {
  monthly?: number;
  quarterly?: number;
  halfYearly?: number;
  annually?: number;
};

type PlanFeatures = {
  prices?: PlanPrices;
  support?: string;
  boost?: boolean;
  analytics?: boolean;
};


@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {
    
  }


  // ---------------------------------------------------------
  //Subscribe to Plan
  // ---------------------------------------------------------
async subscribeToPlan(
  dto: SubscribeToPlanDto
): Promise<BaseResponseDto<SubscriptionResponseDto>> {
  try {
    // ---------------------------------------
    // 1. Validate user
    // ---------------------------------------

    this.logger.debug(`Subscribing Account ${dto.subscriberUuid} to plan ${dto.planId}`);  
   
    // ---------------------------------------
    // 2. Validate plan
    // ---------------------------------------
    this.logger.debug(`Validating plan ID: ${dto.planId}`);
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      const response = {
        success: false,
        message: 'Invalid plan',
        code: 'PLAN_NOT_FOUND',
        subscriptions: null,
        error: { message: 'Plan does not exist' },
      };
      return response;
    }



    const features = JSON.parse(plan.features) as PlanFeatures;
    this.logger.debug(`Plan Features: ${JSON.stringify(features)}`);  

    // ---------------------------------------
    // 3. Check if this is a recurring plan
    //    (Only one active recurring plan allowed per user)
    // ---------------------------------------
    this.logger.debug(`Checking for active plans for account ${dto.subscriberUuid}`);  
    const activePlan = await this.prisma.subscription.findFirst({
      where: {
        accountUuid: dto.subscriberUuid,
        type: 'PLAN',
        status: 'ACTIVE',
      },
    });

    if (activePlan) {
      const response = {
        success: false,
        message: 'Account already has an active recurring plan',
        code: 'PLAN_ALREADY_ACTIVE',
        subscriptions: null,
        error: { message: 'Cannot subscribe to multiple active recurring plans' },
      };
      return response;
    }
    this.logger.debug(`No active recurring plans found for account ${dto.subscriberUuid}`);  

    // ---------------------------------------
    // 4. Pricing & expiry
    // ---------------------------------------
    let totalAmount = 0;
    let amountPaid = dto.amountPaid ?? 0;
    let billingCycle: string | null = dto.billingCycle ?? null;
    let expiresAt: Date;
    let allowPartial = false; //declare outside block for scope

    const isFreePlan = !features.prices || Object.keys(features.prices).length === 0;

    if (isFreePlan) {
      totalAmount = 0;
      amountPaid = 0;
      billingCycle = null;
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      this.logger.debug(`Plan is free. Setting totalAmount is: ${totalAmount} and amountPaid to ${amountPaid},billing cycle: ${billingCycle} for account ${dto.subscriberUuid}`);

      this.logger.debug(`Free plan activated for user ${dto.subscriberUuid}, expires at ${expiresAt}`);

    } else {
      if (!billingCycle) {
        const response = {
          success: false,
          message: 'Billing cycle required',
          code: 'BILLING_CYCLE_REQUIRED',
          subscriptions: null,
          error: { message: 'Paid plans require a billing cycle' },
        };
        return response;
      }

      totalAmount = features.prices[billingCycle];


      if (!totalAmount || totalAmount <= 0) {
        const response = {
          success: false,
          message: 'Invalid billing cycle',
          code: 'INVALID_BILLING_CYCLE',
          subscriptions: null,
          error: { message: 'Pricing not configured for selected cycle' },
        };
        return response;
      }

      // Partial payment logic for quarterly+ plans
      allowPartial = ['quarterly', 'halfYearly', 'annually'].includes(billingCycle);

      if (allowPartial && amountPaid > 0 && amountPaid < totalAmount) {
        const MIN_PARTIAL_THRESHOLD = 0.5;
        if (amountPaid / totalAmount < MIN_PARTIAL_THRESHOLD) {
          const response = {
            success: false,
            message: `Minimum partial payment is ${MIN_PARTIAL_THRESHOLD * 100}%`,
            code: 'PARTIAL_PAYMENT_TOO_LOW',
            subscriptions: null,
            error: { message: 'Partial payment below allowed threshold' },
          };
          return response;
        }

        // Proportional expiry
        expiresAt = new Date();
        const cycleMonthsMap = { monthly: 1, quarterly: 3, halfYearly: 6, annually: 12 };
        const fullMonths = cycleMonthsMap[billingCycle] ?? 1;
        const proportionalMonths = fullMonths * (amountPaid / totalAmount);
        expiresAt.setMonth(expiresAt.getMonth() + Math.floor(proportionalMonths));
      } else if (amountPaid !== totalAmount) {
        const response = {
          success: false,
          message: 'Full payment required',
          code: 'FULL_PAYMENT_REQUIRED',
          subscriptions: null,
          error: { message: 'Payment must match total amount' },
        };
        return response;
      } else {
        expiresAt = new Date();
        const monthsMap = { monthly: 1, quarterly: 3, halfYearly: 6, annually: 12 };
        const monthsToAdd = monthsMap[billingCycle] ?? 1;
        expiresAt.setMonth(expiresAt.getMonth() + monthsToAdd);
      }
    }




    // ---------------------------------------
    // 5. Create subscription
    // ---------------------------------------
    const subscription = await this.prisma.subscription.create({
      data: {
        accountUuid: dto.subscriberUuid,
        planId: plan.id,
        type: 'PLAN',
        entityIds: dto.entityIds ?? [],
        status: allowPartial && amountPaid < totalAmount ? 'PARTIALLY_PAID' : 'ACTIVE',
        billingCycle,
        totalAmount,
        amountPaid,
        currency: dto.currency ?? 'KES',
        startedAt: new Date(),
        expiresAt,
      },
      include: { plan: true },
    });

    this.logger.debug(`Subscription created with ID: ${subscription.id} for account ${dto.subscriberUuid}`);

    // ---------------------------------------
    // 6. Build response
    // ---------------------------------------
    const response = {
      success: true,
      message: 'Subscription created successfully',
      code: 'SUBSCRIPTION_CREATED',
      subscription: 
        {
          id: subscription.id,
          subscriberUuid: subscription.accountUuid,
          plan: subscription.plan.name,
          type: subscription.type,
          entityIds: subscription.entityIds ?? [],
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          totalAmount: subscription.totalAmount,
          amountPaid: subscription.amountPaid,
          currency: subscription.currency,
          startedAt: subscription.startedAt.toISOString(),
          expiresAt: subscription.expiresAt.toISOString(),
          createdAt: subscription.createdAt.toISOString(),
          updatedAt: subscription.updatedAt.toISOString(),
      },

      error: null,
    };
    this.logger.debug(`Subscription Response: ${JSON.stringify(response)}`);
    return response;
  } catch (err: unknown) {
    const error = err as Error;
    const response = {
      success: false,
      message: 'Failed to subscribe',
      code: 'SUBSCRIPTION_FAILED',
      subscription: null,
      error: { message: error.message, details: error.stack },
    };
    return response;
  }
}


  // ---------------------------------------------------------
// GET ACTIVE SUBSCRIPTIONS BY ACCOUNT UUID
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
      const success = {
        success: false,
        message: 'No active subscriptions found',
        code: 'SUBSCRIPTIONS_NOT_FOUND',
        subscriptions: null,
        error: { message: 'No active subscriptions for this account' },
      };
      return success;
    }



    const success =  {
      success: true,
      message: 'Subscriptions retrieved successfully',
      code: 'FETCHED',
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        accountUuid: sub.accountUuid,
        plan: sub.plan ? sub.plan.name : undefined,
        type: sub.type,
        entityIds: sub.entityIds ?? [],
        status: sub.status,
        billingCycle: sub.billingCycle,
        totalAmount: sub.totalAmount ?? undefined,
        amountPaid: sub.amountPaid ?? undefined,
        currency: sub.currency ?? 'KES',
        startedAt: sub.startedAt.toISOString(),
        expiresAt: sub.expiresAt.toISOString(),
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
      })),
      error: null,
    };
    return success;


  } catch (err: unknown) {
    const error = err as Error;
    this.logger.error(`Failed to fetch subscriptions: ${error.message}`, error.stack);

    const failure =  {
      success: false,
      message: 'Failed to fetch subscriptions',
      code: 'FETCH_SUBSCRIPTIONS_FAILED',
      subscriptions: null,
      error: { message: error.message, details: error.stack },
    };
    return failure;
  }
}

}
