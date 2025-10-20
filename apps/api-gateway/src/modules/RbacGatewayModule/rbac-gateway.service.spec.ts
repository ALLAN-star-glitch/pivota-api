import { Test, TestingModule } from '@nestjs/testing';
import { RbacGatewayService } from './rbac-gateway.service';

describe('RbacGatewayService', () => {
  let service: RbacGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RbacGatewayService],
    }).compile();

    service = module.get<RbacGatewayService>(RbacGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
