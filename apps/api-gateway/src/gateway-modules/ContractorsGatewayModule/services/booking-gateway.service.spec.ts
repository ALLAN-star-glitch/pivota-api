import { Test, TestingModule } from '@nestjs/testing';
import { BookingGatewayService } from './booking-gateway.service';

describe('BookingGatewayService', () => {
  let service: BookingGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingGatewayService],
    }).compile();

    service = module.get<BookingGatewayService>(BookingGatewayService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
