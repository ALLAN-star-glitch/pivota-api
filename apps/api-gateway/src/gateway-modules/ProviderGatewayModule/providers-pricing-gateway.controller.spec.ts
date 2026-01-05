import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersPricingGatewayController } from './providers-pricing-gateway.controller';

describe('ProvidersPricingGatewayController', () => {
  let controller: ProvidersPricingGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersPricingGatewayController],
    }).compile();

    controller = module.get<ProvidersPricingGatewayController>(
      ProvidersPricingGatewayController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
