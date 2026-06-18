import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationOnboardingService } from './organization-onboarding.service';

describe('OrganizationOnboardingService', () => {
  let service: OrganizationOnboardingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationOnboardingService],
    }).compile();

    service = module.get<OrganizationOnboardingService>(
      OrganizationOnboardingService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
