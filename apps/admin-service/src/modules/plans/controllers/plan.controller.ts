import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  CreatePlanDto,
  PlanResponseDto,
  UpdatePlanDto,
} from '@pivota-api/dtos';
import { PlanService } from '../services/plan.service';


@Controller('plan')
export class PlanController {
  private readonly logger = new Logger(PlanController.name);

  constructor(private readonly planService: PlanService) {}

  // ---------------------------------------
  // CREATE PLAN
  // ---------------------------------------
  @GrpcMethod('PlanService', 'CreatePlan')
  createPlan(
    data: CreatePlanDto,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    this.logger.debug(`CreatePlan RequestDto: ${JSON.stringify(data)}`);
    return this.planService.createPlan(data);
  }

  // ---------------------------------------
  // UPDATE PLAN
  // ---------------------------------------
  @GrpcMethod('PlanService', 'UpdatePlan')
  updatePlan(
    data: { id: string; dto: UpdatePlanDto },
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    this.logger.debug(`UpdatePlan RequestDto: ${JSON.stringify(data)}`);
    return this.planService.updatePlan(data.id, data.dto);
  }
  

  // ---------------------------------------
  // GET PLAN BY ID
  // ---------------------------------------
  @GrpcMethod('PlanService', 'GetPlanById')
  getPlanById(
    data: { id: string },
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    this.logger.debug(`GetPlanById Request: ${JSON.stringify(data)}`);
    return this.planService.getPlanById(data.id);
  }

  // ---------------------------------------
  // GET PLAN BY NAME
  // ---------------------------------------
  @GrpcMethod('PlanService', 'GetPlanByName')
  getPlanByName(
    data: { name: string },
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    this.logger.debug(`GetPlanByName Request: ${JSON.stringify(data)}`);
    return this.planService.getPlanByName(data.name);
  }

  // ---------------------------------------
  // GET ALL PLANS
  // ---------------------------------------
  @GrpcMethod('PlanService', 'GetAllPlans')
  getAllPlans(): Promise<BaseResponseDto<PlanResponseDto[]>> {
    this.logger.debug(`GetAllPlans Request`);
    return this.planService.getAllPlans();
  }

  // ---------------------------------------
  // DELETE PLAN
  // ---------------------------------------
  @GrpcMethod('PlanService', 'DeletePlan')
  deletePlan(
    data: { id: string },
  ): Promise<BaseResponseDto<null>> {
    this.logger.debug(`DeletePlan Request: ${JSON.stringify(data)}`);
    return this.planService.deletePlan(data.id);
  }
}
