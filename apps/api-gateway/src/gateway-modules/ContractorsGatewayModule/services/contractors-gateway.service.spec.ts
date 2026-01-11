import { Test, TestingModule } from '@nestjs/testing';
import { ContractorsGatewayService } from './contractors-gateway.service';

describe('ProvidersGatewayService', () => {
  let service: ContractorsGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractorsGatewayService],
    }).compile();

    service = module.get<ContractorsGatewayService>(ContractorsGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
