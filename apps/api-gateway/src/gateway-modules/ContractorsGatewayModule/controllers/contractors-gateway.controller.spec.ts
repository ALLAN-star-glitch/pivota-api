import { Test, TestingModule } from '@nestjs/testing';
import { ContractorsGatewayController } from './contractors-gateway.controller';

describe('ProvidersGatewayController', () => {
  let controller: ContractorsGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractorsGatewayController],
    }).compile();

    controller = module.get<ContractorsGatewayController>(
      ContractorsGatewayController
    );
  });
  

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
