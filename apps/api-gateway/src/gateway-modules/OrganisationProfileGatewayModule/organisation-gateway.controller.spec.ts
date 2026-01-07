import { Test, TestingModule } from '@nestjs/testing';
import { OrganisationGatewayController } from './organisation-gateway.controller';

describe('OrganisationGatewayController', () => {
  let controller: OrganisationGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganisationGatewayController],
    }).compile();

    controller = module.get<OrganisationGatewayController>(
      OrganisationGatewayController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
