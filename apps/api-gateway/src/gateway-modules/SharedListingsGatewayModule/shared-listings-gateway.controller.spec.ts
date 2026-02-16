import { Test, TestingModule } from '@nestjs/testing';
import { SharedListingsGatewayController } from './shared-listings-gateway.controller';

describe('SharedListingsGatewayController', () => {
  let controller: SharedListingsGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharedListingsGatewayController],
    }).compile();

    controller = module.get<SharedListingsGatewayController>(
      SharedListingsGatewayController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
