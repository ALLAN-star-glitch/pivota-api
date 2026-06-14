import { Test, TestingModule } from '@nestjs/testing';
import { CustomerConfirmationController } from './customer-confirmation.controller';

describe('CustomerConfirmationController', () => {
  let controller: CustomerConfirmationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerConfirmationController],
    }).compile();

    controller = module.get<CustomerConfirmationController>(
      CustomerConfirmationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
