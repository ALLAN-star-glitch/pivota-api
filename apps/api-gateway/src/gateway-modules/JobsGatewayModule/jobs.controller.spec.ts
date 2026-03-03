import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { GetOwnJobsFilterDto, GetAdminJobsFilterDto, BaseResponseDto, JobPostResponseDto, JobPostStatus } from '@pivota-api/dtos';
import { JwtRequest } from '@pivota-api/interfaces';
import { RolesGuard } from '../../guards/role.guard';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  const mockJobsService = {
    getOwnJobs: jest.fn(),
    getAdminJobs: jest.fn(),
  };

  const mockUser = {
    userUuid: 'user-uuid-123',
    accountId: 'account-id-456',
    role: 'GeneralUser',
    userName: 'Test User',
    accountName: 'Test Account',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
    .overrideGuard(SubscriptionGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOwnJobs', () => {
    it('should call getOwnJobs service method without status', async () => {
      const req = { user: mockUser } as JwtRequest;
      const query: GetOwnJobsFilterDto = {};
      const expectedResult = BaseResponseDto.ok<JobPostResponseDto[]>([]);
      mockJobsService.getOwnJobs.mockResolvedValue(expectedResult);

      const result = await controller.getOwnJobs(req, query);

      expect(service.getOwnJobs).toHaveBeenCalledWith(mockUser.userUuid, undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should call getOwnJobs service method with status', async () => {
      const req = { user: mockUser } as JwtRequest;
      const query: GetOwnJobsFilterDto = { status: JobPostStatus.ACTIVE };
      const expectedResult = BaseResponseDto.ok<JobPostResponseDto[]>([]);
      mockJobsService.getOwnJobs.mockResolvedValue(expectedResult);

      await controller.getOwnJobs(req, query);

      expect(service.getOwnJobs).toHaveBeenCalledWith(mockUser.userUuid, JobPostStatus.ACTIVE);
    });
  });

  describe('getAdminJobs', () => {
    it('should call getAdminJobs service method with various filters including status', async () => {
        const req = { user: { ...mockUser, role: 'SystemAdmin' } } as JwtRequest;
        const query: GetAdminJobsFilterDto = { status: JobPostStatus.CLOSED, accountId: 'some-account-id' };
        const expectedResult = BaseResponseDto.ok<JobPostResponseDto[]>([]);
        mockJobsService.getAdminJobs.mockResolvedValue(expectedResult);

        const result = await controller.getAdminJobs(req, query);

        expect(service.getAdminJobs).toHaveBeenCalledWith(query);
        expect(result).toEqual(expectedResult);
    });
  });
});
