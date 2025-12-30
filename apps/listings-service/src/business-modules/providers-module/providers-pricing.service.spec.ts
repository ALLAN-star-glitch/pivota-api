import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersPricingService } from './providers-pricing.service';

describe('ProvidersPricingService', () => {
  let service: ProvidersPricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvidersPricingService],
    }).compile();

    service = module.get<ProvidersPricingService>(ProvidersPricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
