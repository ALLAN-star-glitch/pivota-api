import { Test, TestingModule } from '@nestjs/testing';
import { PlanFeatureService } from './plan-feature.service';

describe('PlanFeatureService', () => {
  let service: PlanFeatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanFeatureService],
    }).compile();

    service = module.get<PlanFeatureService>(PlanFeatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
