import { Test, TestingModule } from '@nestjs/testing';
import { ContractorsPricingService } from './contractors-pricing.service';

describe('ProvidersPricingService', () => {
  let service: ContractorsPricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractorsPricingService],
    }).compile();

    service = module.get<ContractorsPricingService>(ContractorsPricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
