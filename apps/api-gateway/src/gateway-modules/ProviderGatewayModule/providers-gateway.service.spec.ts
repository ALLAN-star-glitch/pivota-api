import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersGatewayService } from './providers-gateway.service';

describe('ProvidersGatewayService', () => {
  let service: ProvidersGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvidersGatewayService],
    }).compile();

    service = module.get<ProvidersGatewayService>(ProvidersGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
