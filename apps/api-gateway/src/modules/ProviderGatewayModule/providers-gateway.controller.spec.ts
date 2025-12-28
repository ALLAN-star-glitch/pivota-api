import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersGatewayController } from './providers-gateway.controller';

describe('ProvidersGatewayController', () => {
  let controller: ProvidersGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersGatewayController],
    }).compile();

    controller = module.get<ProvidersGatewayController>(
      ProvidersGatewayController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
