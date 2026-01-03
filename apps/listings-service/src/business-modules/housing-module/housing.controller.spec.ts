import { Test, TestingModule } from '@nestjs/testing';
import { HousingController } from './housing.controller';

describe('HousingController', () => {
  let controller: HousingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousingController],
    }).compile();

    controller = module.get<HousingController>(HousingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
