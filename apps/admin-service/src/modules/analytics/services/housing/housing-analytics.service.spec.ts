import { Test, TestingModule } from '@nestjs/testing';
import { HousingAnalyticsService } from './housing-analytics.service';

describe('HousingAnalyticsService', () => {
  let service: HousingAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousingAnalyticsService],
    }).compile();

    service = module.get<HousingAnalyticsService>(HousingAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
