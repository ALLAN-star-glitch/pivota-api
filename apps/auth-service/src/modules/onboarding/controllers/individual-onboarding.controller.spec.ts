import { Test, TestingModule } from '@nestjs/testing';
import { IndividualOnboardingController } from './individual-onboarding.controller';

describe('IndividualOnboardingController', () => {
  let controller: IndividualOnboardingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndividualOnboardingController],
    }).compile();

    controller = module.get<IndividualOnboardingController>(
      IndividualOnboardingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
