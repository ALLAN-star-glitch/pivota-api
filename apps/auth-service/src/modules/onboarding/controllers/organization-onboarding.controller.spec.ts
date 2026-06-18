import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationOnboardingController } from './organization-onboarding.controller';

describe('OrganizationOnboardingController', () => {
  let controller: OrganizationOnboardingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationOnboardingController],
    }).compile();

    controller = module.get<OrganizationOnboardingController>(
      OrganizationOnboardingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
