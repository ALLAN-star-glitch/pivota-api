import { Test, TestingModule } from '@nestjs/testing';
import { HousingAnalyticsController } from './housing-analytics.controller';

describe('HousingAnalyticsController', () => {
  let controller: HousingAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousingAnalyticsController],
    }).compile();

    controller = module.get<HousingAnalyticsController>(
      HousingAnalyticsController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
