import { Test, TestingModule } from '@nestjs/testing';
import { ServiceExecutionGatewayService } from './service-execution-gateway.service';

describe('ServiceExecutionGatewayService', () => {
  let service: ServiceExecutionGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceExecutionGatewayService],
    }).compile();

    service = module.get<ServiceExecutionGatewayService>(
      ServiceExecutionGatewayService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
