import { Test, TestingModule } from '@nestjs/testing';
import { SecurityEmailService } from './security-email.service';

describe('SecurityEmailService', () => {
  let service: SecurityEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityEmailService],
    }).compile();

    service = module.get<SecurityEmailService>(SecurityEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
