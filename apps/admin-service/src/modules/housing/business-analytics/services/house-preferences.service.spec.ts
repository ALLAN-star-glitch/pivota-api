import { Test, TestingModule } from '@nestjs/testing';
import { HousePreferencesService } from './house-preferences.service';

describe('HousePreferencesService', () => {
  let service: HousePreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousePreferencesService],
    }).compile();

    service = module.get<HousePreferencesService>(HousePreferencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
