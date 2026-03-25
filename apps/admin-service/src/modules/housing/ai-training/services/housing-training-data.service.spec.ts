import { Test, TestingModule } from '@nestjs/testing';
import { HousingTrainingDataService } from './housing-training-data.service';

describe('HousingTrainingDataService', () => {
  let service: HousingTrainingDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousingTrainingDataService],
    }).compile();

    service = module.get<HousingTrainingDataService>(
      HousingTrainingDataService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
