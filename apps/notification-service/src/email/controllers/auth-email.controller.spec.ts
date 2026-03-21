import { Test, TestingModule } from '@nestjs/testing';
import { AuthEmailController } from './auth-email.controller';

describe('AuthEmailController', () => {
  let controller: AuthEmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthEmailController],
    }).compile();

    controller = module.get<AuthEmailController>(AuthEmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
