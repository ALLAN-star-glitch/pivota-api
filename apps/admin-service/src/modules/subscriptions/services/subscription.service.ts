import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
  UserResponseDto,
} from '@pivota-api/dtos';
import { BaseUserResponseGrpc } from '@pivota-api/interfaces';

interface UserServiceGrpc {
  getUserProfileByUuid(
    data: { userUuid: string }
  ): Observable<BaseUserResponseGrpc<UserResponseDto>>;
}

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
  private userGrpcService: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_PACKAGE') private readonly grpcClient: ClientGrpc
  ) {
    this.userGrpcService =
      this.grpcClient.getService<UserServiceGrpc>('UserService');
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

    this.logger.debug(`Subscribing user ${dto.subscriberUuid} to plan ${dto.planId}`);  
    const userResponse = await firstValueFrom(
      this.userGrpcService.getUserProfileByUuid({
        userUuid: dto.subscriberUuid,
      })
    );

    if (!userResponse?.success || !userResponse.user) {
      const response = {
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        subscriptions: null,
        error: { message: 'Cannot subscribe non-existent user' },
      };
      return response;
    }

    this.logger.debug(`User ${dto.subscriberUuid} found, proceeding with subscription`);  


    const user = userResponse.user;

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
    this.logger.debug(`Checking for active plans for user ${dto.subscriberUuid}`);  
    const activePlan = await this.prisma.subscription.findFirst({
      where: {
        userUuid: dto.subscriberUuid,
        type: 'PLAN',
        status: 'ACTIVE',
      },
    });

    if (activePlan) {
      const response = {
        success: false,
        message: 'User already has an active recurring plan',
        code: 'PLAN_ALREADY_ACTIVE',
        subscriptions: null,
        error: { message: 'Cannot subscribe to multiple active recurring plans' },
      };
      return response;
    }
    this.logger.debug(`No active recurring plans found for user ${dto.subscriberUuid}`);  

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

      this.logger.debug(`Plan is free. Setting totalAmount is: ${totalAmount} and amountPaid to ${amountPaid},billing cycle: ${billingCycle} for user ${dto.subscriberUuid}`);

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
        userUuid: dto.subscriberUuid,
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

    this.logger.debug(`Subscription created with ID: ${subscription.id} for user ${dto.subscriberUuid}`);

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
          userUuid: subscription.userUuid,
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
          user: {
            id: user.uuid,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email ?? undefined,
          },
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
  // GET ACTIVE SUBSCRIPTIONS BY USER UUID
  // ---------------------------------------------------------
  async getSubscriptionsByUser(
    userUuid: string
  ): Promise<BaseResponseDto<SubscriptionResponseDto[]>> {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
        where: { userUuid, status: 'ACTIVE' },
        include: { plan: true },
      });

      if (!subscriptions || subscriptions.length === 0) {
        const success = {
          success: false,
          message: 'No active subscriptions found',
          code: 'SUBSCRIPTIONS_NOT_FOUND',
          subscription: null,
          error: { message: 'No active subscriptions for this user' },
        };
        return success;
      }

      const userGrpcResponse = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid })
      );
      const user = userGrpcResponse?.user;

      const success = {
        success: true,
        message: 'Subscriptions retrieved successfully',
        code: 'FETCHED',
        subscriptions: subscriptions.map((sub) => ({
          id: sub.id,
          userUuid: sub.userUuid,
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
          user: user 
            ? {
                id: user.uuid,
                fullName: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email ?? undefined,
              }
            : undefined,
        })),
        error: null,
      };
      return success;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to fetch subscriptions: ${error.message}`,
        error.stack
      );

      const response = {
        success: false,
        message: 'Failed to fetch subscriptions',
        code: 'FETCH_SUBSCRIPTIONS_FAILED',
        subscriptions: null,
        error: { message: error.message, details: error.stack },
      };
      return response;
    }
  }
}
