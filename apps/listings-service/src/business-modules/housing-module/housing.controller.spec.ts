import { Test, TestingModule } from '@nestjs/testing';
import { HousingController } from './housing.controller';
import { HousingService } from './housing.service';
import { GetAdminHousingFilterDto, GetListingsByOwnerDto } from '@pivota-api/dtos';

describe('HousingController', () => {
  let controller: HousingController;
  let service: HousingService;

  const mockHousingService = {
    getAdminListings: jest.fn(),
    getListingsByOwner: jest.fn(),
    createHouseListing: jest.fn(),
    createAdminHouseListing: jest.fn(),
    getHouseListingById: jest.fn(),
    searchListings: jest.fn(),
    updateHouseListing: jest.fn(),
    updateAdminHouseListing: jest.fn(),
    updateListingStatus: jest.fn(),
    archiveHouseListing: jest.fn(),
    scheduleViewing: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousingController],
      providers: [
        {
          provide: HousingService,
          useValue: mockHousingService,
        },
      ],
    }).compile();

    controller = module.get<HousingController>(HousingController);
    service = module.get<HousingService>(HousingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAdminListings', () => {
    it('should call service with status filter', async () => {
      const filterDto: GetAdminHousingFilterDto = { status: 'AVAILABLE' };
      await controller.getAdminListings(filterDto);
      expect(service.getAdminListings).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('getListingsByOwner', () => {
    it('should call service with owner and status filter', async () => {
      const filterDto: GetListingsByOwnerDto = { ownerId: 'owner-123', status: 'SOLD' };
      await controller.getListingsByOwner(filterDto);
      expect(service.getListingsByOwner).toHaveBeenCalledWith(filterDto);
    });
  });
});
