import { Test, TestingModule } from '@nestjs/testing';
import { PlansGatewayService } from './plans-gateway.service';

describe('PlansGatewayService', () => {
  let service: PlansGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansGatewayService],
    }).compile();

    service = module.get<PlansGatewayService>(PlansGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
