import { Test, TestingModule } from '@nestjs/testing';
import { ContractorsPricingController } from './contractors-pricing.controller';

describe('ProvidersPricingController', () => {
  let controller: ContractorsPricingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractorsPricingController],
    }).compile();

    controller = module.get<ContractorsPricingController>(
      ContractorsPricingController
    );
  });
  

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
