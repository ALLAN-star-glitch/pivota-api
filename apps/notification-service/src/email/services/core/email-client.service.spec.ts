import { Test, TestingModule } from '@nestjs/testing';
import { EmailClientService } from './email-client.service';

describe('EmailClientService', () => {
  let service: EmailClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailClientService],
    }).compile();

    service = module.get<EmailClientService>(EmailClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
