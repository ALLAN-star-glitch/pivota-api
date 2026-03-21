import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEmailController } from './payment-email.controller';

describe('PaymentEmailController', () => {
  let controller: PaymentEmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentEmailController],
    }).compile();

    controller = module.get<PaymentEmailController>(PaymentEmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
