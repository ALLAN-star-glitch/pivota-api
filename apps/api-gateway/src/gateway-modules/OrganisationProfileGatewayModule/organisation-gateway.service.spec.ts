import { Test, TestingModule } from '@nestjs/testing';
import { OrganisationGatewayService } from './organisation-gateway.service';

describe('OrganisationGatewayService', () => {
  let service: OrganisationGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganisationGatewayService],
    }).compile();

    service = module.get<OrganisationGatewayService>(
      OrganisationGatewayService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
