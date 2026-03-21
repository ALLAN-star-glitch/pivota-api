import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEmailService } from './payment-email.service';

describe('PaymentEmailService', () => {
  let service: PaymentEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentEmailService],
    }).compile();

    service = module.get<PaymentEmailService>(PaymentEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
