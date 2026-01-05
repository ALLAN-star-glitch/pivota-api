import { Test, TestingModule } from '@nestjs/testing';
import { HousingGatewayService } from './housing-gateway.service';

describe('HousingGatewayService', () => {
  let service: HousingGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousingGatewayService],
    }).compile();

    service = module.get<HousingGatewayService>(HousingGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
