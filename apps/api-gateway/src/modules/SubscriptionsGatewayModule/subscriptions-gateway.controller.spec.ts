import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsGatewayController } from './subscriptions-gateway.controller';

describe('SubscriptionsGatewayController', () => {
  let controller: SubscriptionsGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsGatewayController],
    }).compile();

    controller = module.get<SubscriptionsGatewayController>(
      SubscriptionsGatewayController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
