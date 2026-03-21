import { Test, TestingModule } from '@nestjs/testing';
import { EmailBaseService } from './email-base.service';

describe('EmailBaseService', () => {
  let service: EmailBaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailBaseService],
    }).compile();

    service = module.get<EmailBaseService>(EmailBaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
