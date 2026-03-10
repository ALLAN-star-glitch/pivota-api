import { Test, TestingModule } from '@nestjs/testing';
import { AuthAnalyticsService } from './auth-analytics.service';

describe('AuthAnalyticsService', () => {
  let service: AuthAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthAnalyticsService],
    }).compile();

    service = module.get<AuthAnalyticsService>(AuthAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
