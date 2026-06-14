import { Test, TestingModule } from '@nestjs/testing';
import { ServiceExecutionGatewayController } from './service-execution-gateway.controller';

describe('ServiceExecutionGatewayController', () => {
  let controller: ServiceExecutionGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceExecutionGatewayController],
    }).compile();

    controller = module.get<ServiceExecutionGatewayController>(
      ServiceExecutionGatewayController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
