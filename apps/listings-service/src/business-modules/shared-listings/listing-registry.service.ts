import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { 
  AdminListingFilterDto, 
  BaseResponseDto, 
  ListingRegistryDataDto,
  JobPostResponseDto,
  HouseListingResponseDto,
  ServiceOfferingResponseDto,
  SupportProgramResponseDto
} from '@pivota-api/dtos';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ListingRegistryService {
  private readonly logger = new Logger(ListingRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ======================================================
  // 1. GET OWN LISTINGS (Standard User / Dashboard)
  // ======================================================
  /**
   * Fetches all listings belonging to the authenticated account.
   */
  async getOwnListings(accountId: string): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    try {
      this.logger.debug(`Fetching own listings for account: ${accountId}`);

      const [jobs, houses, services, support] = await Promise.all([
        this.prisma.jobPost.findMany({ where: { accountId }, include: { category: true } }),
        this.prisma.houseListing.findMany({ where: { accountId }, include: { category: true } }),
        this.prisma.serviceOffering.findMany({ where: { accountId }, include: { category: true } }),
        this.prisma.supportProgram.findMany({ where: { accountId }, include: { category: true } }),
      ]);

      // Calculate counts individually to avoid TypeScript union property errors
      const activeJobs = jobs.filter(i => i.status === 'ACTIVE').length;
      const activeHouses = houses.filter(i => i.status === 'AVAILABLE').length;
      const activeSupport = support.filter(i => i.status === 'ACTIVE').length;
      // ServiceOfferings may not have a status field in your current schema
      const activeServices = services.length; 

      const data: ListingRegistryDataDto = {
        jobs: jobs as unknown as JobPostResponseDto[],
        houses: houses as unknown as HouseListingResponseDto[],
        services: services as unknown as ServiceOfferingResponseDto[],
        support: support as unknown as SupportProgramResponseDto[],
        metadata: {
          totalCount: jobs.length + houses.length + services.length + support.length,
          activeCount: activeJobs + activeHouses + activeServices + activeSupport
        }
      };

      return BaseResponseDto.ok(data, 'Own listings retrieved successfully');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch own listings: ${err.message}`);
      return BaseResponseDto.fail('Failed to retrieve listings', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // 2. GET ADMIN LISTINGS (Targeted Lookup)
  // ======================================================
  /**
   * Allows admins to fetch listings across the system for other users.
   */
  async getAdminListings(query: AdminListingFilterDto): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    try {
      this.logger.debug(`Admin targeted listing lookup: ${JSON.stringify(query)}`);

      // Construct base filter for cross-table querying
      const baseFilter = {
        ...(query.accountId && { accountId: query.accountId }),
        ...(query.creatorId && { creatorId: query.creatorId }),
        ...(query.status && { status: query.status }),
      };

      // Query only the relevant vertical if specified, otherwise query all
      const [jobs, houses, services, support] = await Promise.all([
        (!query.vertical || query.vertical === 'JOBS') 
          ? this.prisma.jobPost.findMany({ where: baseFilter as Prisma.JobPostWhereInput, include: { category: true } })
          : Promise.resolve([]),
        
        (!query.vertical || query.vertical === 'HOUSING')
          ? this.prisma.houseListing.findMany({ where: baseFilter as Prisma.HouseListingWhereInput, include: { category: true } })
          : Promise.resolve([]),
        
        (!query.vertical || query.vertical === 'SERVICES')
          ? this.prisma.serviceOffering.findMany({ where: baseFilter as Prisma.ServiceOfferingWhereInput, include: { category: true } })
          : Promise.resolve([]),
        
        (!query.vertical || query.vertical === 'SOCIAL_SUPPORT')
          ? this.prisma.supportProgram.findMany({ where: baseFilter as Prisma.SupportProgramWhereInput, include: { category: true } })
          : Promise.resolve([]),
      ]);

      const data: ListingRegistryDataDto = {
        jobs: jobs as unknown as JobPostResponseDto[],
        houses: houses as unknown as HouseListingResponseDto[],
        services: services as unknown as ServiceOfferingResponseDto[],
        support: support as unknown as SupportProgramResponseDto[],
        metadata: {
          totalCount: jobs.length + houses.length + services.length + support.length,
          appliedFilters: query as Record<string, unknown>
        }
      };

      return BaseResponseDto.ok(data, 'Admin listings retrieved successfully');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Admin listing fetch failed: ${err.message}`);
      return BaseResponseDto.fail('Internal failure during administrative retrieval', 'ERROR');
    }
  }

  // ======================================================
  // 3. SHARED CATEGORY VALIDATION
  // ======================================================
  /**
   * Guards the vertical integrity of categories across the system.
   */
  async validateVerticalHierarchy(
    vertical: 'JOBS' | 'HOUSING' | 'SOCIAL_SUPPORT' | 'SERVICES',
    categoryId: string,
    subCategoryId?: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { vertical: true },
    });

    if (!category || category.vertical !== vertical) {
      return { isValid: false, error: `Invalid category: Expected vertical ${vertical}` };
    }

    if (subCategoryId) {
      const sub = await this.prisma.category.findUnique({
        where: { id: subCategoryId },
        select: { parentId: true, vertical: true },
      });

      if (!sub || sub.vertical !== vertical || sub.parentId !== categoryId) {
        return { isValid: false, error: `Sub-category hierarchy mismatch for vertical ${vertical}` };
      }
    }

    return { isValid: true };
  }
}