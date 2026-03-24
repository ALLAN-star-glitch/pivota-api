import { Test, TestingModule } from '@nestjs/testing';
import { HousingTrainingDataGatewayService } from './housing-training-data-gateway.service';

describe('HousingTrainingDataGatewayService', () => {
  let service: HousingTrainingDataGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousingTrainingDataGatewayService],
    }).compile();

    service = module.get<HousingTrainingDataGatewayService>(
      HousingTrainingDataGatewayService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
