import { Test, TestingModule } from '@nestjs/testing';
import { SocialSupportService } from './social-support.service';

describe('SocialSupportService', () => {
  let service: SocialSupportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocialSupportService],
    }).compile();

    service = module.get<SocialSupportService>(SocialSupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
