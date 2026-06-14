import { Test, TestingModule } from '@nestjs/testing';
import { ServiceExecutionController } from './service-execution.controller';

describe('ServiceExecutionController', () => {
  let controller: ServiceExecutionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceExecutionController],
    }).compile();

    controller = module.get<ServiceExecutionController>(
      ServiceExecutionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
