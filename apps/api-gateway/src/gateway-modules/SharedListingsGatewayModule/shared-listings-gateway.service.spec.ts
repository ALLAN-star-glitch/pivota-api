import { Test, TestingModule } from '@nestjs/testing';
import { SharedListingsGatewayService } from './shared-listings-gateway.service';

describe('SharedListingsGatewayService', () => {
  let service: SharedListingsGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedListingsGatewayService],
    }).compile();

    service = module.get<SharedListingsGatewayService>(
      SharedListingsGatewayService
    );
  });

  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
