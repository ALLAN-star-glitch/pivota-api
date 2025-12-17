import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  SubscriptionResponseDto,
  AssignPlanDto,
} from '@pivota-api/dtos';
import { SubscriptionService } from '../services/subscription.service';

@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ---------------------------------------
  // ASSIGN PLAN TO USER
  // ---------------------------------------
  @GrpcMethod('SubscriptionService', 'AssignPlanToUser')
  assignPlan(
    data: AssignPlanDto,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    this.logger.debug(`AssignPlan RequestDto: ${JSON.stringify(data)}`);
    return this.subscriptionService.assignPlanToUser(data);
  }

  // ---------------------------------------
  // GET SUBSCRIPTION BY USER UUID
  // ---------------------------------------
  @GrpcMethod('SubscriptionService', 'GetSubscriptionByUser')
  getSubscriptionByUser(
    data: { userUuid: string },
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    this.logger.debug(`GetSubscriptionByUser Request: ${JSON.stringify(data)}`);
    return this.subscriptionService.getSubscriptionByUser(data.userUuid);
  }
}

