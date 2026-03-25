import { Test, TestingModule } from '@nestjs/testing';
import { HousePreferencesController } from './house-preferences.controller';

describe('HousePreferencesController', () => {
  let controller: HousePreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousePreferencesController],
    }).compile();

    controller = module.get<HousePreferencesController>(
      HousePreferencesController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
