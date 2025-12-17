import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  SubscriptionResponseDto,
  UserResponseDto,
  AssignPlanDto,
} from '@pivota-api/dtos';
import { BaseUserResponseGrpc } from '@pivota-api/interfaces';

interface UserServiceGrpc {
  getUserProfileByUuid(
    data: { userUuid: string }
  ): Observable<BaseUserResponseGrpc<UserResponseDto>>;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private userGrpcService: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_PACKAGE') private readonly grpcClient: ClientGrpc
  ) {
    this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>(
      'UserService'
    );
  }

  /**
   * Assign a plan to a user using DTO
   */
  async assignPlanToUser(
    dto: AssignPlanDto
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    try {
      const userGrpcResponse = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({
          userUuid: dto.subscriberUuid,
        })
      );

      if (!userGrpcResponse?.success || !userGrpcResponse.user) {
        const failure_response = {
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          subscription: null,
          error: { message: 'Cannot assign plan to non-existent user' },
        };
        return failure_response;
      }

      const user = userGrpcResponse.user;

      // Calculate expiration date
      const now = new Date();
      const expiresAt = new Date(now);
      switch (dto.billingCycle || 'monthly') {
        case 'monthly':
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          break;
        case 'quarterly':
          expiresAt.setMonth(expiresAt.getMonth() + 3);
          break;
        case 'halfYearly':
          expiresAt.setMonth(expiresAt.getMonth() + 6);
          break;
        case 'annually':
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          break;
        default:
          expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Create subscription
      const subscription = await this.prisma.subscription.create({
        data: {
          userUuid: dto.subscriberUuid,
          planId: dto.planId, 
          status: dto.status || 'ACTIVE',
          billingCycle: dto.billingCycle || 'monthly',
          startedAt: now,
          expiresAt,
        },
        include: {
          plan: true
        }
      });

      const success_response = {
        success: true,
        message: `Plan '${subscription.plan.name}' assigned successfully`,
        code: 'CREATED',
        subscription: {
          id: subscription.id,
          plan: subscription.plan.name,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
          user: {
            id: user.uuid,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email ?? undefined,
          },
        },
        error: null,
      };

      return success_response;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to assign plan: ${error.message}`, error.stack);

      const failure_response = {
        success: false,
        message: 'Failed to assign plan',
        code: 'ASSIGN_PLAN_FAILED',
        subscription: null,
        error: { message: error.message, details: error.stack },
      };

      return failure_response;
    }
  }

  /**
   * Get subscription by user UUID
   */
  async getSubscriptionByUser(
    userUuid: string
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userUuid, status: 'ACTIVE' },
        include: {
          plan: true
        }
      });

      if (!subscription) {
        const failure_response = {
          success: false,
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
          subscription: null,
          error: { message: 'No subscription exists for this user' },
        };
        return failure_response;
      }

      const userGrpcResponse = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid })
      );

      const user = userGrpcResponse?.user;

      const success_response = {
        success: true,
        message: 'Subscription retrieved successfully',
        code: 'FETCHED',
        subscription: {
          id: subscription.id,
          userUuid: subscription.userUuid,
          plan: subscription.plan.name,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
          user: user
            ? {
                id: user.uuid,
                fullName: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email ?? undefined,
              }
            : undefined,
        },
        error: null,
      };

      return success_response;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to fetch subscription: ${error.message}`, error.stack);

      const failure_response = {
        success: false,
        message: 'Failed to fetch subscription',
        code: 'FETCH_SUBSCRIPTION_FAILED',
        subscription: null,
        error: { message: error.message, details: error.stack },
      };

      return failure_response;
    }
  }
}
