import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  AccessDataDto,
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
    this.logger.debug(`SubscribeToPlan Request: ${JSON.stringify(data)}`);
    return this.subscriptionService.subscribeToPlan(data);
  }

  // ---------------------------------------
  // GET SUBSCRIPTION BY Account UUID
  // ---------------------------------------
  @GrpcMethod('SubscriptionService', 'GetSubscriptionsByAccount')
  getSubscriptionsByUser(
    data: { accountUuid: string },
  ): Promise<BaseResponseDto<SubscriptionResponseDto[]>> {
    this.logger.debug(`GetSubscriptionsByAccount Request: ${JSON.stringify(data)}`);
    return this.subscriptionService.getSubscriptionsByAccount(data.accountUuid);
  }

  // ---------------------------------------
  // CHECK MODULE ACCESS
  // ---------------------------------------
  @GrpcMethod('SubscriptionService', 'CheckModuleAccess')
async checkModuleAccess(data: {
  accountUuid: string;
  moduleSlug: string;
}): Promise<BaseResponseDto<AccessDataDto>> {
  this.logger.debug(`CheckModuleAccess Request: ${JSON.stringify(data)}`);

  const result = await this.subscriptionService.checkModuleAccess(
    data.accountUuid,
    data.moduleSlug,
  );

  // CRITICAL: Stringify the restrictions object for gRPC wire compatibility
  if (result.data && typeof result.data.restrictions !== 'string') {
    result.data.restrictions = JSON.stringify(result.data.restrictions);
  }

  return result;
}
}