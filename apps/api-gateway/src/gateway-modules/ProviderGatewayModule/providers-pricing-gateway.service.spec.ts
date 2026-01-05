import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersPricingGatewayService } from './providers-pricing-gateway.service';

describe('ProvidersPricingGatewayService', () => {
  let service: ProvidersPricingGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvidersPricingGatewayService],
    }).compile();

    service = module.get<ProvidersPricingGatewayService>(
      ProvidersPricingGatewayService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
