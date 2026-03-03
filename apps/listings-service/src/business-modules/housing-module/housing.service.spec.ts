import { Test, TestingModule } from '@nestjs/testing';
import { HousingService } from './housing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduleViewingGrpcRequestDto, BaseResponseDto } from '@pivota-api/dtos';

const mockPrismaService = {
  houseListing: {
    findUnique: jest.fn(),
  },
  houseViewing: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((callback) => callback(mockPrismaService)),
};

describe('HousingService', () => {
  let service: HousingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HousingService>(HousingService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleViewing', () => {
    const scheduleDto: ScheduleViewingGrpcRequestDto = {
      houseId: 'house-123',
      callerId: 'user-456',
      viewingDate: new Date().toISOString(),
      userRole: 'GeneralUser',
    };

    it('should schedule a viewing successfully', async () => {
      mockPrismaService.houseListing.findUnique.mockResolvedValue({ status: 'AVAILABLE' });
      mockPrismaService.houseViewing.findFirst.mockResolvedValue(null);
      mockPrismaService.houseViewing.create.mockResolvedValue({ id: 'viewing-789' });

      const result = await service.scheduleViewing(scheduleDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Viewing scheduled successfully.');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.houseListing.findUnique).toHaveBeenCalledWith({
        where: { id: scheduleDto.houseId },
        select: { status: true },
      });
      expect(prisma.houseViewing.create).toHaveBeenCalled();
    });

    it('should fail if the listing does not exist', async () => {
      mockPrismaService.houseListing.findUnique.mockResolvedValue(null);

      const result = await service.scheduleViewing(scheduleDto);

      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('The specified house listing does not exist.');
    });

    it('should fail if the listing is not AVAILABLE', async () => {
      mockPrismaService.houseListing.findUnique.mockResolvedValue({ status: 'SOLD' });

      const result = await service.scheduleViewing(scheduleDto);

      expect(result.success).toBe(false);
      expect(result.code).toBe('LISTING_NOT_AVAILABLE');
      expect(result.message).toContain('not available for viewings');
    });

    it('should fail if a viewing is already scheduled', async () => {
      mockPrismaService.houseListing.findUnique.mockResolvedValue({ status: 'AVAILABLE' });
      mockPrismaService.houseViewing.findFirst.mockResolvedValue({ id: 'existing-viewing' });

      const result = await service.scheduleViewing(scheduleDto);

      expect(result.success).toBe(false);
      expect(result.code).toBe('ALREADY_SCHEDULED');
      expect(result.message).toBe('You have already scheduled a viewing for this property.');
    });

    it('should handle foreign key constraint errors gracefully', async () => {
      const error = {
        code: 'P2003',
        message: 'FK constraint failed',
      };
      mockPrismaService.$transaction.mockRejectedValue(error);

      const result = await service.scheduleViewing(scheduleDto);

      expect(result.success).toBe(false);
      expect(result.code).toBe('BAD_REQUEST');
      expect(result.message).toBe('Invalid data provided for scheduling.');
    });
  });
});
