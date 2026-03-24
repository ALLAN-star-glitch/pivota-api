import { Test, TestingModule } from '@nestjs/testing';
import { HousingTrainingDataController } from './housing-training-data.controller';

describe('HousingTrainingDataController', () => {
  let controller: HousingTrainingDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousingTrainingDataController],
    }).compile();

    controller = module.get<HousingTrainingDataController>(
      HousingTrainingDataController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
