import { Test, TestingModule } from '@nestjs/testing';
import { HousingTrainingDataGatewayController } from './housing-training-data-gateway.controller';

describe('HousingTrainingDataGatewayController', () => {
  let controller: HousingTrainingDataGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousingTrainingDataGatewayController],
    }).compile();

    controller = module.get<HousingTrainingDataGatewayController>(
      HousingTrainingDataGatewayController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
