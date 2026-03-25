import { Test, TestingModule } from '@nestjs/testing';
import { AuthAnalyticsController } from './auth-analytics.controller';

describe('AuthAnalyticsController', () => {
  let controller: AuthAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthAnalyticsController],
    }).compile();

    controller = module.get<AuthAnalyticsController>(AuthAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
