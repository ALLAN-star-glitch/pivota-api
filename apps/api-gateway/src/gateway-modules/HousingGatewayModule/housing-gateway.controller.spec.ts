import { Test, TestingModule } from '@nestjs/testing';
import { HousingGatewayController } from './housing-gateway.controller';

describe('HousingGatewayController', () => {
  let controller: HousingGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousingGatewayController],
    }).compile();

    controller = module.get<HousingGatewayController>(HousingGatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
