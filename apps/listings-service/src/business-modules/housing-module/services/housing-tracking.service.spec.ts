import { Test, TestingModule } from '@nestjs/testing';
import { HousingTrackingService } from './housing-tracking.service';

describe('HousingTrackingService', () => {
  let service: HousingTrackingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousingTrackingService],
    }).compile();

    service = module.get<HousingTrackingService>(HousingTrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
