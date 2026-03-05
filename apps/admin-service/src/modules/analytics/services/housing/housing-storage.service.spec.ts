import { Test, TestingModule } from '@nestjs/testing';
import { HousingStorageService } from './housing-storage.service';

describe('HousingStorageService', () => {
  let service: HousingStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousingStorageService],
    }).compile();

    service = module.get<HousingStorageService>(HousingStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
