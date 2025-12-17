import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsGatewayService } from './subscriptions-gateway.service';

describe('SubscriptionsGatewayService', () => {
  let service: SubscriptionsGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionsGatewayService],
    }).compile();

    service = module.get<SubscriptionsGatewayService>(
      SubscriptionsGatewayService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
