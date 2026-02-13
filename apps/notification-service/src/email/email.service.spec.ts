import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    process.env.MAILJET_API_KEY = process.env.MAILJET_API_KEY || 'test-key';
    process.env.MAILJET_API_SECRET = process.env.MAILJET_API_SECRET || 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
