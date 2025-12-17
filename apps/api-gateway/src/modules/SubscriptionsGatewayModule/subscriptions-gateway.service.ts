import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  SubscriptionResponseDto,
  AssignPlanDto,
} from '@pivota-api/dtos';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';

interface SubscriptionsServiceGrpc {
  AssignPlanToUser(
    data: AssignPlanDto,
  ): Observable<BaseSubscriptionResponseGrpc<SubscriptionResponseDto>>;

  GetSubscriptionByUser(
    data: { userUuid: string },
  ): Observable<BaseSubscriptionResponseGrpc<SubscriptionResponseDto>>;
}

@Injectable()
export class SubscriptionsGatewayService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsGatewayService.name);
  private grpcService: SubscriptionsServiceGrpc;

  constructor(
    @Inject('SUBSCRIPTIONS_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.grpcService = this.grpcClient.getService<SubscriptionsServiceGrpc>(
      'SubscriptionService',
    );
  }

  // ===========================================================
  // ASSIGN PLAN
  // ===========================================================
  async assignPlan(
    dto: AssignPlanDto,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const res = await firstValueFrom(this.grpcService.AssignPlanToUser(dto));
    this.logger.debug(`AssignPlan gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.subscription, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET SUBSCRIPTION BY USER
  // ===========================================================
  async getSubscriptionByUser(
    userUuid: string,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetSubscriptionByUser({ userUuid }),
    );
    this.logger.debug(`GetSubscriptionByUser gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.subscription, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }
}
