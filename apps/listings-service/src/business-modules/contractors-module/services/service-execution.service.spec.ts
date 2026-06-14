import { Test, TestingModule } from '@nestjs/testing';
import { ServiceExecutionService } from './service-execution.service';

describe('ServiceExecutionService', () => {
  let service: ServiceExecutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceExecutionService],
    }).compile();

    service = module.get<ServiceExecutionService>(ServiceExecutionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
