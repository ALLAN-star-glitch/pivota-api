import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  CreatePlanDto,
  PlanResponseDto,
  UpdatePlanDto,
  UserResponseDto,
  GetUserByUserUuidDto,
} from '@pivota-api/dtos';
import { BaseUserResponseGrpc } from '@pivota-api/interfaces';

interface UserServiceGrpc {
  getUserProfileByUuid(
    data: GetUserByUserUuidDto,
  ): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}

@Injectable()
export class PlanService implements OnModuleInit {
  private readonly logger = new Logger(PlanService.name);
  private userGrpcService: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_PACKAGE') private readonly userService: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userGrpcService = this.userService.getService<UserServiceGrpc>('UserService');
  }

  private getGrpcService(): UserServiceGrpc {
    if (!this.userGrpcService) {
      this.userGrpcService = this.userService.getService<UserServiceGrpc>('UserService');
    }
    return this.userGrpcService;
  }

  // =========================================================
  // CREATE PLAN
  // =========================================================
  async createPlan(dto: CreatePlanDto): Promise<BaseResponseDto<PlanResponseDto>> {
    try {
      const plan = await this.prisma.plan.create({
        data: {
          name: dto.name,
          description: dto.description,
          totalListings: dto.totalListings,
          features: dto.features ? JSON.stringify(dto.features) : undefined,
          creatorId: dto.userId,
          planModules: dto.planModules
            ? {
                create: dto.planModules.map(pm => ({
                  moduleId: pm.moduleId,
                  restrictions: pm.restrictions ? JSON.stringify(pm.restrictions) : '{}',
                })),
              }
            : undefined,
        },
        include: { planModules: { include: { module: true } } },
      });

      this.logger.debug('Fetching creator...');
      const userGrpcService = this.getGrpcService();
      const creator$ = userGrpcService.getUserProfileByUuid({ userUuid: plan.creatorId });
      const creatorRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(creator$);

      const planResponse: PlanResponseDto = {
        id: plan.id,
        name: plan.name,
        description: plan.description ?? undefined,
        totalListings: plan.totalListings,
        features: plan.features ? JSON.parse(plan.features) : undefined,
        user: {
          id: creatorRes.user.uuid,
          fullName: `${creatorRes.user.firstName} ${creatorRes.user.lastName}`.trim(),
          email: creatorRes.user.email ?? undefined,
        },
        planModules: plan.planModules.map(pm => ({
          moduleId: pm.moduleId,
          moduleSlug: pm.module.slug,
          moduleName: pm.module.name,
          restrictions: pm.restrictions ? JSON.parse(pm.restrictions) : {},
        })),
      };

      const success = {
        success: true,
        message: 'Plan created successfully',
        code: 'CREATED',
        plan: planResponse,
        error: null,
      };
      return success;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Create plan failed: ${error.message}`, error.stack);
      const failure = {
        success: false,
        message: 'Failed to create plan',
        code: 'PLAN_CREATION_FAILED',
        plan: null,
        error: { message: error.message, details: error.stack },
      };
      return failure;
    }
  }

  // =========================================================
  // UPDATE PLAN
  // =========================================================
  async updatePlan(planId: string, dto: UpdatePlanDto): Promise<BaseResponseDto<PlanResponseDto>> {
    try {
      const updated = await this.prisma.plan.update({
        where: { id: planId },
        data: {
          name: dto.name,
          description: dto.description,
          totalListings: dto.totalListings,
          features: dto.features ? JSON.stringify(dto.features) : undefined,
        },
        include: { planModules: { include: { module: true } } },
      });

      const userGrpcService = this.getGrpcService();
      const user$ = userGrpcService.getUserProfileByUuid({ userUuid: updated.creatorId });
      const userRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(user$);

      const planResponse: PlanResponseDto = {
        id: updated.id,
        name: updated.name,
        description: updated.description ?? undefined,
        totalListings: updated.totalListings,
        features: updated.features ? JSON.parse(updated.features) : undefined,
        user: {
          id: userRes.user.uuid,
          fullName: `${userRes.user.firstName} ${userRes.user.lastName}`.trim(),
          email: userRes.user.email ?? undefined,
        },
        planModules: updated.planModules.map(pm => ({
          moduleId: pm.moduleId,
          moduleSlug: pm.module.slug,
          moduleName: pm.module.name,
          restrictions: pm.restrictions ? JSON.parse(pm.restrictions) : {},
        })),
      };

      const success = {
        success: true,
        message: 'Plan updated successfully',
        code: 'UPDATED',
        plan: planResponse,
        error: null,
      };
      return success;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Update plan failed: ${error.message}`, error.stack);
      const failure = {
        success: false,
        message: 'Failed to update plan',
        code: 'PLAN_UPDATE_FAILED',
        plan: null,
        error: { message: error.message, details: error.stack },
      };
      return failure;
    }
  }

  // =========================================================
  // GET PLAN BY ID
  // =========================================================
  async getPlanById(planId: string): Promise<BaseResponseDto<PlanResponseDto>> {
    try {
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
        include: { planModules: { include: { module: true } } },
      });

      if (!plan) {
        const failure = {
          success: false,
          message: 'Plan not found',
          code: 'PLAN_NOT_FOUND',
          plan: null,
          error: { message: 'No plan exists with this ID', details: null },
        };
        return failure;
      }

      const userGrpcService = this.getGrpcService();
      const creator$ = userGrpcService.getUserProfileByUuid({ userUuid: plan.creatorId });
      const creatorRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(creator$);

      const planResponse: PlanResponseDto = {
        id: plan.id,
        name: plan.name,
        description: plan.description ?? undefined,
        totalListings: plan.totalListings,
        features: plan.features ? JSON.parse(plan.features) : undefined,
        user: {
          id: creatorRes.user.uuid,
          fullName: `${creatorRes.user.firstName} ${creatorRes.user.lastName}`.trim(),
          email: creatorRes.user.email ?? undefined,
        },
        planModules: plan.planModules.map(pm => ({
          moduleId: pm.moduleId,
          moduleSlug: pm.module.slug,
          moduleName: pm.module.name, 
          restrictions: pm.restrictions ? JSON.parse(pm.restrictions) : {},
        })),
      };

      const success = {
        success: true,
        message: 'Plan retrieved successfully',
        code: 'FETCHED',
        plan: planResponse,
        error: null,
      };
      return success;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Fetch plan failed: ${error.message}`, error.stack);
      const failure = {
        success: false,
        message: 'Failed to fetch plan',
        code: 'FETCH_FAILED',
        plan: null,
        error: { message: error.message, details: error.stack },
      };
      return failure;
    }
  }

  // =========================================================
  // GET PLAN BY NAME
  // =========================================================
  async getPlanByName(planName: string): Promise<BaseResponseDto<PlanResponseDto>> {
    try {
      const plan = await this.prisma.plan.findUnique({
        where: { name: planName },
        include: { planModules: { include: { module: true } } },
      });

      if (!plan) {
        const failure = {
          success: false,
          message: 'Plan not found',
          code: 'PLAN_NOT_FOUND',
          plan: null,
          error: { message: 'No plan exists with this name', details: null },
        };
        return failure;
      }

      const userGrpcService = this.getGrpcService();
      const creator$ = userGrpcService.getUserProfileByUuid({ userUuid: plan.creatorId });
      const creatorRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(creator$);

      const planResponse: PlanResponseDto = {
        id: plan.id,
        name: plan.name,
        description: plan.description ?? undefined,
        totalListings: plan.totalListings,
        features: plan.features ? JSON.parse(plan.features) : undefined,
        user: {
          id: creatorRes.user.uuid,
          fullName: `${creatorRes.user.firstName} ${creatorRes.user.lastName}`.trim(),
          email: creatorRes.user.email ?? undefined,
        },
        planModules: plan.planModules.map(pm => ({
          moduleId: pm.moduleId,
          moduleSlug: pm.module.slug,
          moduleName: pm.module.name, 
          restrictions: pm.restrictions ? JSON.parse(pm.restrictions) : {},
        })),
      };

      const success = {
        success: true,
        message: 'Plan retrieved successfully',
        code: 'FETCHED',
        plan: planResponse,
        error: null,
      };
      return success;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Fetch plan by name failed: ${error.message}`, error.stack);
      const failure = {
        success: false,
        message: 'Failed to fetch plan',
        code: 'FETCH_FAILED',
        plan: null,
        error: { message: error.message, details: error.stack },
      };
      return failure;
    }
  }

  // =========================================================
  // GET ALL PLANS
  // =========================================================
  async getAllPlans(): Promise<BaseResponseDto<PlanResponseDto[]>> {
    try {
      const plans = await this.prisma.plan.findMany({
        include: { planModules: { include: { module: true } } },
      });

      const userGrpcService = this.getGrpcService();

      const plansResponse: PlanResponseDto[] = await Promise.all(
        plans.map(async plan => {
          const creator$ = userGrpcService.getUserProfileByUuid({ userUuid: plan.creatorId });
          const creatorRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(creator$);

          return {
            id: plan.id,
            name: plan.name,
            description: plan.description ?? undefined,
            totalListings: plan.totalListings,
            features: plan.features ? JSON.parse(plan.features) : undefined,
            creator: {
              id: creatorRes.user.uuid,
              fullName: `${creatorRes.user.firstName} ${creatorRes.user.lastName}`.trim(),
              email: creatorRes.user.email ?? undefined,
            },
            planModules: plan.planModules.map(pm => ({
              moduleId: pm.moduleId,
              moduleSlug: pm.module.slug,
              moduleName: pm.module.name, 
              restrictions: pm.restrictions ? JSON.parse(pm.restrictions) : {},
            })),
          };
        }),
      );

      const success = {
        success: true,
        message: `Plans retrieved successfully. Total plans: ${plans.length}`,
        code: 'FETCHED',
        plan: plansResponse,
        error: null,
      };
      return success;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Fetch all plans failed: ${error.message}`, error.stack);
      const failure = {
        success: false,
        message: 'Failed to fetch plans',
        code: 'FETCH_FAILED',
        plan: null,
        error: { message: error.message, details: error.stack },
      };
      return failure;
    }
  }

  // =========================================================
  // DELETE PLAN
  // =========================================================
  async deletePlan(planId: string): Promise<BaseResponseDto<null>> {
    try {
      await this.prisma.plan.delete({ where: { id: planId } });

      const success = {
        success: true,
        message: 'Plan deleted successfully',
        code: 'DELETED',
        plan: null,
        error: null,
      };
      return success;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Delete plan failed: ${error.message}`, error.stack);
      const failure = {
        success: false,
        message: 'Failed to delete plan',
        code: 'DELETE_FAILED',
        plan: null,
        error: { message: error.message, details: error.stack },
      };
      return failure;
    }
  }
}
