import { Test, TestingModule } from '@nestjs/testing';
import { CustomerConfirmationService } from './customer-confirmation.service';

describe('CustomerConfirmationService', () => {
  let service: CustomerConfirmationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerConfirmationService],
    }).compile();

    service = module.get<CustomerConfirmationService>(
      CustomerConfirmationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
