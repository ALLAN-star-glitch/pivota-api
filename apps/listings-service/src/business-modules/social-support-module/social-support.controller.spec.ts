import { Test, TestingModule } from '@nestjs/testing';
import { SocialSupportController } from './social-support.controller';

describe('SocialSupportController', () => {
  let controller: SocialSupportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialSupportController],
    }).compile();

    controller = module.get<SocialSupportController>(SocialSupportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
