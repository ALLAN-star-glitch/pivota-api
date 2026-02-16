import { Test, TestingModule } from '@nestjs/testing';
import { ListingRegistryService } from './listing-registry.service';

describe('ListingRegistryService', () => {
  let service: ListingRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListingRegistryService],
    }).compile();

    service = module.get<ListingRegistryService>(ListingRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
