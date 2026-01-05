import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
} from '@pivota-api/dtos';
import { SubscriptionService } from '../services/subscription.service';

@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ---------------------------------------
  // Plan Subscription
  // ---------------------------------------
  @GrpcMethod('SubscriptionService', 'SubscribeToPlan')
  subscribeToPlan(
    data: SubscribeToPlanDto,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    this.logger.debug(`RequestDto: ${JSON.stringify(data)}`);
    return this.subscriptionService.subscribeToPlan(data);
  }
  

  // ---------------------------------------
  // GET SUBSCRIPTION BY Account UUID
  // ---------------------------------------
  @GrpcMethod('SubscriptionService', 'GetSubscriptionsByAccount')
  getSubscriptionsByUser(
    data: { accountUuid: string },
  ): Promise<BaseResponseDto<SubscriptionResponseDto[]>> {

    this.logger.debug(`GetSubscriptionByAccount Request: ${JSON.stringify(data)}`);

    const response = this.subscriptionService.getSubscriptionsByAccount(data.accountUuid);

    this.logger.debug(`Subscription Response <Controller>: ${JSON.stringify(response)}`)

    return response;
  }
}

