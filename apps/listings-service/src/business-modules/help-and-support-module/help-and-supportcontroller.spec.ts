import { Test, TestingModule } from '@nestjs/testing';
import { HelpAndSupportController } from './help-and-support.controller';

describe('HelpAndSupportController', () => {
  let controller: HelpAndSupportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelpAndSupportController],
    }).compile();

    controller = module.get<HelpAndSupportController>(HelpAndSupportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
