import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationEmailController } from './organization-email.controller';

describe('OrganizationEmailController', () => {
  let controller: OrganizationEmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationEmailController],
    }).compile();

    controller = module.get<OrganizationEmailController>(
      OrganizationEmailController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
