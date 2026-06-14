import { Test, TestingModule } from '@nestjs/testing';
import { BookingGatewayController } from './booking-gateway.controller';

describe('BookingGatewayController', () => {
  let controller: BookingGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingGatewayController],
    }).compile();

    controller = module.get<BookingGatewayController>(BookingGatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
