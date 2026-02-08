import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  AccessDataDto,
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
} from '@pivota-api/dtos';
import { BaseSubscriptionsResponseGrpc, BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';

interface SubscriptionsServiceGrpc {
  SubscribeToPlan(
    data: SubscribeToPlanDto,
  ): Observable<BaseSubscriptionResponseGrpc<SubscriptionResponseDto>>;

  GetSubscriptionsByAccount(
    data: { accountUuid: string },
  ): Observable<BaseSubscriptionsResponseGrpc<SubscriptionResponseDto>>;

  CheckModuleAccess(
    data: { accountUuid: string; moduleSlug: string },
  ): Observable<BaseResponseDto<AccessDataDto>>;
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
  async getSubscriptionsByAccount(
    accountUuid: string,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetSubscriptionsByAccount({ accountUuid }),
    );
    this.logger.debug(`GetSubscriptionByAccount gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.subscriptions, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  async checkModuleAccess(accountUuid: string, moduleSlug: string): Promise<BaseResponseDto<AccessDataDto>> {
  try {
    const res = await firstValueFrom(
      this.grpcService.CheckModuleAccess({ accountUuid, moduleSlug })
    );
    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  } catch (error) {
    this.logger.error(`Access Check Failed: ${error.message}`);
    return BaseResponseDto.fail('SERVICE_UNAVAILABLE');
  }
}
}
