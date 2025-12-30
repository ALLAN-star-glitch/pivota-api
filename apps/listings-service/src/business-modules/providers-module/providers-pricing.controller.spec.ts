import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersPricingController } from './providers-pricing.controller';

describe('ProvidersPricingController', () => {
  let controller: ProvidersPricingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersPricingController],
    }).compile();

    controller = module.get<ProvidersPricingController>(
      ProvidersPricingController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
