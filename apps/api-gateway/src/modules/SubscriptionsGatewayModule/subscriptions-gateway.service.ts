import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
} from '@pivota-api/dtos';
import { BaseSubscriptionsResponseGrpc, BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';

interface SubscriptionsServiceGrpc {
  SubscribeToPlan(
    data: SubscribeToPlanDto,
  ): Observable<BaseSubscriptionResponseGrpc<SubscriptionResponseDto>>;

  GetSubscriptionsByUser(
    data: { userUuid: string },
  ): Observable<BaseSubscriptionsResponseGrpc<SubscriptionResponseDto>>;
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
  async subscribeToPlan(
    dto: SubscribeToPlanDto,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const res = await firstValueFrom(this.grpcService.SubscribeToPlan(dto));
    this.logger.debug(`AssignPlan gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.subscription, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET SUBSCRIPTION BY USER
  // ===========================================================
  async getSubscriptionsByUser(
    userUuid: string,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetSubscriptionsByUser({ userUuid }),
    );
    this.logger.debug(`GetSubscriptionByUser gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.subscriptions, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }
}
