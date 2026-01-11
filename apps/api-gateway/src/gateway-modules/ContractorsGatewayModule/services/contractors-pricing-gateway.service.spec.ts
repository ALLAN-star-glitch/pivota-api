import { Test, TestingModule } from '@nestjs/testing';
import { ContractorsPricingGatewayService } from './contractors-pricing-gateway.service';

describe('ProvidersPricingGatewayService', () => {
  let service: ContractorsPricingGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractorsPricingGatewayService],
    }).compile();

    service = module.get<ContractorsPricingGatewayService>(
      ContractorsPricingGatewayService
    );
  });

  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
