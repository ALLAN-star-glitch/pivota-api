import { Test, TestingModule } from '@nestjs/testing';
import { AuthEmailService } from './auth-email.service';

describe('AuthEmailService', () => {
  let service: AuthEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthEmailService],
    }).compile();

    service = module.get<AuthEmailService>(AuthEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
