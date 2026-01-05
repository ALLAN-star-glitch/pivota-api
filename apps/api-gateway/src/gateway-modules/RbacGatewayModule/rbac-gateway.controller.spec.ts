import { Test, TestingModule } from '@nestjs/testing';
import { RbacGatewayController } from './rbac-gateway.controller';

describe('RbacGatewayController', () => {
  let controller: RbacGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RbacGatewayController],
    }).compile();

    controller = module.get<RbacGatewayController>(RbacGatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
