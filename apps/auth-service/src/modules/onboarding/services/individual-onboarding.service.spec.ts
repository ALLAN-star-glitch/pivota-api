import { Test, TestingModule } from '@nestjs/testing';
import { IndividualOnboardingService } from './individual-onboarding.service';

describe('IndividualOnboardingService', () => {
  let service: IndividualOnboardingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IndividualOnboardingService],
    }).compile();

    service = module.get<IndividualOnboardingService>(
      IndividualOnboardingService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
