import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationEmailService } from './organization-email.service';

describe('OrganizationEmailService', () => {
  let service: OrganizationEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationEmailService],
    }).compile();

    service = module.get<OrganizationEmailService>(OrganizationEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
