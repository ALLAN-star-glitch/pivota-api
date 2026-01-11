/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import {
  HouseListingResponseDto,
  BaseResponseDto,
  HouseViewingResponseDto,
  UpdateHouseListingStatusDto,
  SearchHouseListingsDto,
  GetHouseListingByIdDto,
  GetListingsByOwnerDto,
  UpdateHouseListingGrpcRequestDto,
  ScheduleViewingGrpcRequestDto,
  CreateHouseListingGrpcRequestDto,
  ArchiveHouseListingsGrpcRequestDto,
} from '@pivota-api/dtos';

// Internal interface for Prisma results with relations
interface HouseListingWithRelations {
  id: string;
  externalId: string;
  creatorId: string;   // The human author
  creatorName: string; // Denormalized name
  accountId: string;   // The Org or Individual Account
  accountName: string; // Denormalized name
  title: string;
  description: string;
  listingType: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
  } | null;
  bathrooms: number | null;
  amenities: string[];
  isFurnished: boolean;
  locationCity: string;
  locationNeighborhood: string | null;
  address: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
}

@Injectable()
export class HousingService {
  private readonly logger = new Logger(HousingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ======================================================
  // CREATE HOUSE LISTING
  // ======================================================
  async createHouseListing(
    dto: CreateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      // 1. Validate Category
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, vertical: 'HOUSING' },
      });

      if (!category) {
        return {
          success: false,
          message: 'Invalid category for Housing pillar',
          code: 'INVALID_CATEGORY',
          data: null,
        };
      }

      // 2. Atomic Creation with Identity Pillars
      // Injected by Gateway: ownerName, accountId, accountName
      const created = (await this.prisma.houseListing.create({
        data: {
          creatorId: dto.creatorId,
          creatorName: dto.creatorName, 
          accountId: dto.accountId,
          accountName: dto.accountName,
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          listingType: dto.listingType,
          price: dto.price,
          currency: dto.currency ?? 'KES',
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          amenities: dto.amenities ?? [],
          isFurnished: dto.isFurnished ?? false,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood,
          address: dto.address,
          status: 'AVAILABLE',
          images: dto.imageUrls
            ? {
                create: dto.imageUrls.map((url, index) => ({
                  url,
                  isMain: index === 0,
                })),
              }
            : undefined,
        },
        include: {
          images: true,
          category: true,
        },
      })) as unknown as HouseListingWithRelations;

      return {
        success: true,
        message: 'House listing created successfully',
        code: 'CREATED',
        data: this.mapToResponseDto(created),
        error: null,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`CreateHouseListing Error: ${err.message}`);
      return {
        success: false,
        message: 'Failed to create listing',
        code: 'ERROR',
        data: null,
        error: { message: err.message },
      };
    }
  }

  // ======================================================
  // GET SINGLE HOUSE LISTING
  // ======================================================
  async getHouseListingById(
    dto: GetHouseListingByIdDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      const listing = (await this.prisma.houseListing.findUnique({
        where: { id: dto.id },
        include: { images: true, category: true },
      })) as unknown as HouseListingWithRelations | null;

      if (!listing) {
        return {
          success: false,
          message: 'Listing not found',
          code: 'NOT_FOUND',
          data: null,
        };
      }

      return {
        success: true,
        message: 'Listing fetched successfully',
        code: 'FETCHED',
        data: this.mapToResponseDto(listing),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Fetch failed',
        code: 'ERROR',
        data: null,
      };
    }
  }

  // ======================================================
  // SEARCH LISTINGS (High Performance - No gRPC)
  // ======================================================
  async searchListings(
    dto: SearchHouseListingsDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    try {
      const where: Record<string, unknown> = { status: 'AVAILABLE' };

      if (dto.city) where.locationCity = dto.city;
      if (dto.listingType) where.listingType = dto.listingType;
      if (dto.categoryId) where.categoryId = dto.categoryId;
      if (dto.minPrice || dto.maxPrice) {
        where.price = {
          gte: dto.minPrice ?? 0,
          lte: dto.maxPrice ?? Number.MAX_SAFE_INTEGER,
        };
      }
      if (dto.bedrooms) where.bedrooms = { gte: dto.bedrooms };

      const listings = (await this.prisma.houseListing.findMany({
        where,
        include: { images: true, category: true },
        orderBy: { createdAt: 'desc' },
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
      })) as unknown as HouseListingWithRelations[];

      // Map instantly without calling User Service
      const data = listings.map((l) => this.mapToResponseDto(l));

      return {
        success: true,
        message: 'Listings fetched successfully',
        code: 'FETCHED',
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        code: 'SEARCH_ERROR',
        data: [],
      };
    }
  }

  // ======================================================
  // UPDATE LISTING
  // ======================================================
  async updateHouseListing(
    dto: UpdateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const listing = await this.prisma.houseListing.findUnique({
      where: { id: dto.listingId },
    });

    if (!listing) {
      return {
        success: false,
        message: 'Listing not found',
        code: 'NOT_FOUND',
        data: null,
      };
    }

    // Auth check (Owner or Admin)
    const isAdmin = ['SuperAdmin', 'SystemAdmin'].includes(dto.userRole);
    if (listing.creatorId !== dto.callerId && !isAdmin) {
      return {
        success: false,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        data: null,
      };
    }

    const updated = (await this.prisma.houseListing.update({
      where: { id: dto.listingId },
      data: { ...dto.data },
      include: { images: true, category: true },
    })) as unknown as HouseListingWithRelations;

    return {
      success: true,
      message: 'Updated successfully',
      code: 'UPDATED',
      data: this.mapToResponseDto(updated),
    };
  }

  // ======================================================
  // SCHEDULE A VIEWING
  // ======================================================
  async scheduleViewing(
    dto: ScheduleViewingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    try {
      const house = await this.prisma.houseListing.findUnique({
        where: { id: dto.houseId },
      });

      if (!house || house.status !== 'AVAILABLE') {
        return {
          success: false,
          message: 'House not available',
          code: 'NOT_AVAILABLE',
          data: null,
        };
      }

      const isAdmin = ['SuperAdmin', 'SystemAdmin'].includes(dto.userRole);
      const finalViewerId =
        isAdmin && dto.targetViewerId ? dto.targetViewerId : dto.callerId;

      if (house.creatorId === finalViewerId) {
        return {
          success: false,
          message: 'Owners cannot schedule viewings for their own houses',
          code: 'FORBIDDEN',
          data: null,
        };
      }

      const viewing = await this.prisma.houseViewing.create({
        data: {
          houseId: dto.houseId,
          viewerId: finalViewerId,
          viewingDate: new Date(dto.viewingDate),
          status: 'SCHEDULED',
          notes: dto.notes || '',
          bookedById: dto.callerId,
        },
      });

      return {
        success: true,
        message: 'Viewing scheduled',
        code: 'SCHEDULED',
        data: viewing as unknown as HouseViewingResponseDto,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to schedule',
        code: 'ERROR',
        data: null,
      };
    }
  }

  // ======================================================
  // GET LISTINGS BY OWNER (Dashboard View)
  // ======================================================
  async getListingsByOwner(
    dto: GetListingsByOwnerDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    try {
      const listings = (await this.prisma.houseListing.findMany({
        where: { accountId: dto.ownerId }, // ownerId here refers to the Account UUID
        include: { images: true, category: true },
        orderBy: { createdAt: 'desc' },
      })) as unknown as HouseListingWithRelations[];

      return {
        success: true,
        message: 'Owner listings fetched successfully',
        code: 'FETCHED',
        data: listings.map((l) => this.mapToResponseDto(l)),
      };
    } catch (error) {
      this.logger.error(`GetListingsByOwner Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { success: false, message: 'Failed to fetch owner listings', code: 'ERROR', data: [] };
    }
  }

  // ======================================================
  // UPDATE LISTING STATUS (Lifecycle: AVAILABLE | SOLD | RENTED)
  // ======================================================
  async updateListingStatus(
    dto: UpdateHouseListingStatusDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      const listing = await this.prisma.houseListing.findUnique({
        where: { id: dto.id },
      });

      // Authorization: Ensure the person changing status belongs to the owning Account
      if (!listing || listing.accountId !== dto.ownerId) {
        return {
          success: false,
          message: 'Unauthorized: You do not own this listing',
          code: 'UNAUTHORIZED',
          data: null,
        };
      }

      const updated = (await this.prisma.houseListing.update({
        where: { id: dto.id },
        data: { status: dto.status },
        include: { images: true, category: true },
      })) as unknown as HouseListingWithRelations;

      return {
        success: true,
        message: `Listing status updated to ${dto.status}`,
        code: 'UPDATED',
        data: this.mapToResponseDto(updated),
      };
    } catch (error) {
      return { success: false, message: 'Status update failed', code: 'ERROR', data: null };
    }
  }

  // ======================================================
  // ARCHIVE (Soft Delete)
  // ======================================================
  async archiveHouseListing(
    dto: ArchiveHouseListingsGrpcRequestDto,
  ): Promise<BaseResponseDto<null>> {
    try {
      const listing = await this.prisma.houseListing.findUnique({
        where: { id: dto.id },
      });

      // Authorization: Check against Account ID
      if (!listing || listing.accountId !== dto.ownerId) {
        return {
          success: false,
          message: 'Unauthorized to archive this listing',
          code: 'UNAUTHORIZED',
          data: null,
        };
      }

      await this.prisma.houseListing.update({
        where: { id: dto.id },
        data: { status: 'ARCHIVED' },
      });

      return {
        success: true,
        message: 'Listing archived successfully',
        code: 'ARCHIVED',
        data: null,
      };
    } catch (error) {
      return { success: false, message: 'Archiving failed', code: 'ERROR', data: null };
    }
  }

  // ======================================================
  // UTILITY MAPPER (The Heart of the Identity Pillar)
  // ======================================================
  private mapToResponseDto(
    listing: HouseListingWithRelations,
  ): HouseListingResponseDto {
    return {
      id: listing.id,
      externalId: listing.externalId,
      title: listing.title,
      description: listing.description,

      category: {
        id: listing.categoryId,
        name: listing.category?.name || 'Property',
        slug: listing.category?.slug || '',
        vertical: 'HOUSING',
      },

      listingType: listing.listingType,
      price: listing.price,
      currency: listing.currency,
      bedrooms: listing.bedrooms ?? undefined,
      bathrooms: listing.bathrooms ?? undefined,
      amenities: listing.amenities,
      isFurnished: listing.isFurnished,
      locationCity: listing.locationCity,
      locationNeighborhood: listing.locationNeighborhood ?? undefined,
      address: listing.address ?? undefined,
      status: listing.status,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,

      images: (listing.images || []).map((img) => ({
        id: img.id,
        url: img.url,
        isMain: img.isMain,
      })),

      // Use Denormalized data for instant mapping
      creator: {
        id: listing.creatorId,
        fullName: listing.creatorName,
      },
      account: {
        id: listing.accountId,
        name: listing.accountName,
      },

      imageUrl: listing.images?.find((img) => img.isMain)?.url ?? undefined,
    };
  }
}