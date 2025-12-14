import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

import {
  BaseResponseDto,
  CreatePlanDto,
  UpdatePlanDto,
  PlanResponseDto,
} from '@pivota-api/dtos';

import {
  BasePlanResponseGrpc,
  BasePlansResponseGrpc,
} from '@pivota-api/interfaces';

interface PlansServiceGrpc {
  CreatePlan(
    data: CreatePlanDto,
  ): Observable<BasePlanResponseGrpc<PlanResponseDto>>;

  GetPlanById(
    data: { id: string },
  ): Observable<BasePlanResponseGrpc<PlanResponseDto>>;

  GetAllPlans(
    data: object,
  ): Observable<BasePlansResponseGrpc<PlanResponseDto[]>>;

  UpdatePlan(
    data: { planId: string; dto: UpdatePlanDto },
  ): Observable<BasePlanResponseGrpc<PlanResponseDto>>;

  DeletePlan(
    data: { id: string },
  ): Observable<BasePlanResponseGrpc<null>>;
}

@Injectable()
export class PlansGatewayService implements OnModuleInit {
  private readonly logger = new Logger(PlansGatewayService.name);
  private grpcService: PlansServiceGrpc;

  constructor(
    @Inject('PLANS_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.grpcService = this.grpcClient.getService<PlansServiceGrpc>(
      'PlanService',
    );
  }

  // ===========================================================
  // CREATE PLAN
  // ===========================================================
  async createPlan(
    dto: CreatePlanDto,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CreatePlan(dto));
    this.logger.debug(`CreatePlan gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.plan, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET PLAN BY ID
  // ===========================================================
  async getPlanById(
    id: string,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    const res = await firstValueFrom(this.grpcService.GetPlanById({ id }));
    this.logger.debug(`GetPlanById gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.plan, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET ALL PLANS
  // ===========================================================
  async getAllPlans(): Promise<BaseResponseDto<PlanResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetAllPlans({}));
    this.logger.debug(`GetAllPlans gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.plans || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // UPDATE PLAN
  // ===========================================================
  async updatePlan(
    planId: string,
    dto: UpdatePlanDto,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.UpdatePlan({ planId, dto }),
    );
    

    this.logger.debug(`UpdatePlan gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.plan, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // DELETE PLAN
  // ===========================================================
  async deletePlan(id: string): Promise<BaseResponseDto<null>> {
    const res = await firstValueFrom(this.grpcService.DeletePlan({ id }));
    this.logger.debug(`DeletePlan gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(null, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }
}
