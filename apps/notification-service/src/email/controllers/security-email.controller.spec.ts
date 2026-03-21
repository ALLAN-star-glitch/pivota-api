import { Test, TestingModule } from '@nestjs/testing';
import { SecurityEmailController } from './security-email.controller';

describe('SecurityEmailController', () => {
  let controller: SecurityEmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityEmailController],
    }).compile();

    controller = module.get<SecurityEmailController>(SecurityEmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
