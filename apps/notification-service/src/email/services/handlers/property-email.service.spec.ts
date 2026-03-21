import { Test, TestingModule } from '@nestjs/testing';
import { PropertyEmailService } from './property-email.service';

describe('PropertyEmailService', () => {
  let service: PropertyEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropertyEmailService],
    }).compile();

    service = module.get<PropertyEmailService>(PropertyEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
