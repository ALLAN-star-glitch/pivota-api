import { Test, TestingModule } from '@nestjs/testing';
import { HousingService } from './housing.service';

describe('HousingService', () => {
  let service: HousingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousingService],
    }).compile();

    service = module.get<HousingService>(HousingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
