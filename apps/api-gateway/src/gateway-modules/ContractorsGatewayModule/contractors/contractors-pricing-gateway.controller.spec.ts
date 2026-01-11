import { Test, TestingModule } from '@nestjs/testing';
import { ContractorsPricingGatewayController } from './contractors-pricing-gateway.controller';

describe('ContractorsPricingGatewayController', () => {
  let controller: ContractorsPricingGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractorsPricingGatewayController],
    }).compile();

    controller = module.get<ContractorsPricingGatewayController>(
      ContractorsPricingGatewayController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
