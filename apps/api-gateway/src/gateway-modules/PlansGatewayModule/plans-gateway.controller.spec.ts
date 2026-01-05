import { Test, TestingModule } from '@nestjs/testing';
import { PlansGatewayController } from './plans-gateway.controller';

describe('PlansGatewayController', () => {
  let controller: PlansGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansGatewayController],
    }).compile();

    controller = module.get<PlansGatewayController>(PlansGatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
