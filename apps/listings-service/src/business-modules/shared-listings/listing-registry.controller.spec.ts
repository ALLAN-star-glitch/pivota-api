import { Test, TestingModule } from '@nestjs/testing';
import { ListingRegistryController } from './listing-registry.controller';

describe('ListingRegistryController', () => {
  let controller: ListingRegistryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingRegistryController],
    }).compile();

    controller = module.get<ListingRegistryController>(
      ListingRegistryController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
