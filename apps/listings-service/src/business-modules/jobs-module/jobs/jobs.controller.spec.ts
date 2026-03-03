import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { CreateJobPostDto, JobPostStatus } from '@pivota-api/dtos';

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  const mockJobsService = {
    createJobPost: jest.fn(),
    getJobPostById: jest.fn(),
    getOwnJobs: jest.fn(),
    getAdminJobs: jest.fn(),
    // NOTE: Add other mocked methods from JobsService here as you expand tests
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
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOwnJobs', () => {
    it('should call the service with creatorId and status', async () => {
      const data = { creatorId: 'user-123', status: JobPostStatus.ACTIVE };
      await controller.getOwnJobs(data);
      expect(service.getOwnJobs).toHaveBeenCalledWith(data.creatorId, data.status);
    });

    it('should call the service with only creatorId when status is omitted', async () => {
      const data = { creatorId: 'user-123' };
      await controller.getOwnJobs(data);
      expect(service.getOwnJobs).toHaveBeenCalledWith(data.creatorId, undefined);
    });
  });

  describe('getAdminJobs', () => {
    it('should call the service with the filter object', async () => {
      const data = {
        accountId: 'account-456',
        status: JobPostStatus.CLOSED,
      };
      await controller.getAdminJobs(data);
      expect(service.getAdminJobs).toHaveBeenCalledWith(data);
    });
  });

  describe('getJobPostById', () => {
    it('should call the service with the job post ID', async () => {
      const data = { id: 'job-post-456' };
      await controller.getJobPostById(data);
      expect(service.getJobPostById).toHaveBeenCalledWith(data.id);
    });
  });

  describe('createJobPost', () => {
    it('should call the service with the complete creation DTO', async () => {
      const data: CreateJobPostDto & { creatorId: string; accountId: string } = {
        title: 'New Job',
        description: 'A great job',
        categoryId: 'cat-1',
        jobType: 'FULL_TIME',
        locationCity: 'Testville',
        payRate: 'HOURLY',
        creatorId: 'user-123',
        accountId: 'account-456',
      };
      await controller.createJobPost(data);
      expect(service.createJobPost).toHaveBeenCalledWith(data);
    });
  });
});
