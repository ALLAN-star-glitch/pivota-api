/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import {
  HouseListingResponseDto,
  BaseResponseDto,
  HouseViewingResponseDto,
  UpdateHouseListingStatusDto,
  SearchHouseListingsDto,
  GetHouseListingByIdDto,
  GetListingsByOwnerDto,
  GetAdminHousingFilterDto,
  UpdateHouseListingGrpcRequestDto,
  ScheduleViewingGrpcRequestDto,
  CreateHouseListingGrpcRequestDto,
  ArchiveHouseListingsGrpcRequestDto,
  HouseListingCreateResponseDto,
} from '@pivota-api/dtos';

/**
 * Internal interface to ensure type safety when mapping Prisma results
 * with relations to our DTOs.
 */
interface HouseListingWithRelations {
  id: string;
  externalId: string;
  creatorId: string;
  creatorName: string;
  accountId: string;
  accountName: string;
  title: string;
  description: string;
  listingType: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  isFurnished: boolean;
  locationCity: string;
  locationNeighborhood: string | null;
  address: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
  } | null;
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
  // CREATE METHODS
  // ======================================================

  async createHouseListing(dto: CreateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    return this.executeCreate(dto);
  }

  async createAdminHouseListing(dto: CreateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    return this.executeCreate(dto);
  }

  private async executeCreate(dto: CreateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    try {
      const categoryExists = await this.prisma.category.count({
        where: { id: dto.categoryId, vertical: 'HOUSING' },
      });

      if (categoryExists === 0)
        return BaseResponseDto.fail('Invalid category for Housing pillar', 'CATEGORY_NOT_FOUND');

      const created = await this.prisma.houseListing.create({
        data: {
          creatorId: dto.creatorId,
          creatorName: dto.creatorName || 'Unknown Agent',
          accountId: dto.accountId,
          accountName: dto.accountName || 'Independent',
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
        select: { id: true, status: true, createdAt: true },
      });

      return BaseResponseDto.ok(
        {
          id: created.id,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
        },
        'Created successfully',
        'CREATED',
      );
    } catch (error) {
      this.logger.error(`Create Error: ${error.message}`);
      return BaseResponseDto.fail('Creation failed', 'ERROR');
    }
  }

  // ======================================================
  // READ METHODS
  // ======================================================

  async getAdminListings(dto: GetAdminHousingFilterDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
  try {
    // 1. Build the query object with explicit types
    const where: Record<string, unknown> = {};

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.accountId) {
      // Validate UUID format if necessary before hitting DB
      where.accountId = dto.accountId;
    }

    this.logger.debug(`🔍 Admin query initiated. Filters: ${JSON.stringify(where)}`);

    // 2. Execute query
    const listings = (await this.prisma.houseListing.findMany({
      where,
      include: {
        images: true,
        category: true
      },
      orderBy: { createdAt: 'desc' },
    })) as unknown as HouseListingWithRelations[];

    // 3. Handle Empty Results
    if (!listings || listings.length === 0) {
      const filterDesc = dto.accountId ? `for account ${dto.accountId}` : 'globally';
      this.logger.log(`ℹ️ Admin search returned zero results ${filterDesc}`);

      return BaseResponseDto.ok([], 'No listings match the provided filters', 'SUCCESS_EMPTY');
    }

    // 4. Successful mapping
    this.logger.log(`✅ Admin retrieved ${listings.length} listings`);
    return BaseResponseDto.ok(
      listings.map((l) => this.mapToDto(l)),
      'Admin listings fetched successfully',
      'OK'
    );

  } catch (error: unknown) {
    // 5. Advanced Error Logging
    const errorMessage = (error as Error).message || 'Unknown database error';

    // Check for specific Prisma errors (e.g., invalid UUID format in accountId)
    if ((error as { code?: string }).code === 'P2023') { // Inconsistent column data (often bad UUID)
      this.logger.warn(`⚠️ Admin provided invalid UUID format: ${dto.accountId}`);
      return BaseResponseDto.fail('Invalid Account ID format provided', 'BAD_REQUEST');
    }

    this.logger.error(`❌ Admin Fetch Failure: ${errorMessage}`, (error as Error).stack);

    return BaseResponseDto.fail(
      'System error occurred while fetching admin records',
      'INTERNAL_ERROR'
    );
  }
}

 async getListingsByOwner(dto: GetListingsByOwnerDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
  const { ownerId, status } = dto;

  try {
    // 1. Validate Input Presence (Defensive)
    if (!ownerId) {
      this.logger.warn(`⚠️ Attempted to fetch listings with missing ownerId`);
      return BaseResponseDto.fail('Owner ID is required to fetch listings', 'BAD_REQUEST');
    }


    // 2. Execute Query
    const listings = await this.prisma.houseListing.findMany({
      where: {
        accountId: ownerId,
        ...(status && { status }),
      },
      include: {
        images: true,
        category: true
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as HouseListingWithRelations[];

    // 3. Handle Empty Results gracefully
    if (!listings || listings.length === 0) {
      this.logger.log(` No ${status || ''} listings found for account: ${ownerId}`);
      // Returning OK with empty array is standard for "No data found"
      return BaseResponseDto.ok([], 'No listings found for this account', 'SUCCESS_EMPTY');
    }

    this.logger.debug(`✅ Successfully fetched ${listings.length} listings for owner ${ownerId}`);

    return BaseResponseDto.ok(
      listings.map((l) => this.mapToDto(l)),
      'Listings retrieved successfully',
      'OK'
    );

  } catch (error: unknown) {
    // 4. Categorize Errors
    this.logger.error(`❌ Database Error while fetching listings for ${ownerId}: ${(error as Error).message}`, (error as Error).stack);

    // Specific Prisma Error handling (Optional but recommended)
    if ((error as { code?: string }).code === 'P2021') {
      return BaseResponseDto.fail('Internal database table missing', 'DATABASE_CONFIG_ERROR');
    }

    return BaseResponseDto.fail(
      'An unexpected error occurred while retrieving your listings',
      'INTERNAL_SERVER_ERROR'
    );
  }
}


  async getHouseListingById(dto: GetHouseListingByIdDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      const listing = await this.prisma.houseListing.findUnique({
        where: { id: dto.id },
        include: { images: true, category: true },
      }) as unknown as HouseListingWithRelations | null;

      if (!listing) return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');

      return BaseResponseDto.ok(this.mapToDto(listing));
    } catch (error) {
      return BaseResponseDto.fail('Fetch failed', 'ERROR');
    }
  }

  async searchListings(dto: SearchHouseListingsDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
  try {
    // Define the 'where' object using the formal Prisma type instead of 'any'
    const where: Record<string, unknown> = {
      status: 'AVAILABLE',
    };

    if (dto.city) {
      where.locationCity = dto.city;
    }

    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      where.price = {
        ...(dto.minPrice !== undefined && { gte: dto.minPrice }),
        ...(dto.maxPrice !== undefined && { lte: dto.maxPrice }),
      };
    }

    if (dto.categoryId) {
      where.categoryId = dto.categoryId;
    }

    const listings = (await this.prisma.houseListing.findMany({
      where,
      include: {
        images: true,
        category: true
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 20,
      skip: dto.offset ?? 0,
    })) as unknown as HouseListingWithRelations[];

    return BaseResponseDto.ok(listings.map((l) => this.mapToDto(l)));
  } catch (error: unknown) {
    this.logger.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return BaseResponseDto.fail('Search failed', 'ERROR');
  }
}

  async getHousesByStatus(status: string): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    try {
      // Validate status input
      const validStatuses = ['AVAILABLE', 'SOLD', 'RENTED', 'ARCHIVED', 'PENDING'];
      if (!validStatuses.includes(status)) {
        return BaseResponseDto.fail('Invalid status provided', 'BAD_REQUEST');
      }

      const listings = await this.prisma.houseListing.findMany({
        where: { status },
        include: {
          images: true,
          category: true
        },
        orderBy: { createdAt: 'desc' },
      }) as unknown as HouseListingWithRelations[];

      if (!listings || listings.length === 0) {
        this.logger.log(`No listings found with status: ${status}`);
        return BaseResponseDto.ok([], 'No listings found for the given status', 'SUCCESS_EMPTY');
      }

      this.logger.debug(`Fetched ${listings.length} listings with status: ${status}`);
      return BaseResponseDto.ok(
        listings.map((l) => this.mapToDto(l)),
        'Listings fetched successfully',
        'OK'
      );
    } catch (error: unknown) {
      this.logger.error(`Error fetching listings by status ${status}: ${(error as Error).message}`, (error as Error).stack);
      return BaseResponseDto.fail('Failed to fetch listings', 'INTERNAL_SERVER_ERROR');
    }
  }

  // ======================================================
  // UPDATE METHODS
  // ======================================================

  async updateHouseListing(dto: UpdateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    return this.executeUpdate(dto, false);
  }

  async updateAdminHouseListing(dto: UpdateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    return this.executeUpdate(dto, true);
  }

  private async executeUpdate(dto: UpdateHouseListingGrpcRequestDto, isAdmin: boolean): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      // IMPORTANT: Explicitly pull out all identifiers to prevent them from being in `updateFields`
      const { listingId, callerId, userRole, accountId, ...updateFields } = dto;

      if (isAdmin) {
          // Admin Flow: First, verify the listing exists.
          const listing = await this.prisma.houseListing.findUnique({
              where: { id: listingId },
              select: { id: true } // Select only what's needed
          });

          if (!listing) {
              return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');
          }

          // Admins can change any field, so we pass the DTO fields directly.
          const updated = await this.prisma.houseListing.update({
              where: { id: listingId },
              data: updateFields,
              include: { images: true, category: true },
          }) as unknown as HouseListingWithRelations;

          return BaseResponseDto.ok(this.mapToDto(updated), 'Admin update successful');
      } else {
          // User Flow: Perform an atomic update with ownership check.
          const updated = await this.prisma.houseListing.update({
              where: {
                  id: listingId,
                  creatorId: callerId // The caller must be the creator of the listing.
              },
              data: updateFields, // `updateFields` for a user does not contain sensitive fields.
              include: { images: true, category: true },
          }) as unknown as HouseListingWithRelations;

          return BaseResponseDto.ok(this.mapToDto(updated), 'Update successful');
      }
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
        this.logger.warn(`Update failed for listing ${dto.listingId}: Not found or unauthorized access by ${dto.callerId}.`);
        return BaseResponseDto.fail('Listing not found or you are not authorized to perform this action', 'NOT_FOUND');
      }

      this.logger.error(`Update failed for listing ${dto.listingId}: ${(error as Error).message}`, (error as Error).stack);
      return BaseResponseDto.fail('Update failed due to an internal error', 'ERROR');
    }
  }

  async updateListingStatus(dto: UpdateHouseListingStatusDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      const updated = await this.prisma.houseListing.update({
        where: {
          id: dto.id,
          accountId: dto.ownerId, // Ensure the owner (Account) is the one updating the status
        },
        data: { status: dto.status },
        include: { images: true, category: true },
      }) as unknown as HouseListingWithRelations;

      return BaseResponseDto.ok(this.mapToDto(updated));
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        this.logger.warn(`Status update failed for listing ${dto.id}: Not found or unauthorized by account ${dto.ownerId}.`);
        return BaseResponseDto.fail('Listing not found or you are not authorized to change its status', 'NOT_FOUND');
      }
      this.logger.error(`Status update failed for listing ${dto.id}: ${(error as Error).message}`, (error as Error).stack);
      return BaseResponseDto.fail('Status update failed', 'ERROR');
    }
  }

  async archiveHouseListing(dto: ArchiveHouseListingsGrpcRequestDto): Promise<BaseResponseDto<null>> {
    try {
      // Archive check against AccountId
      const result = await this.prisma.houseListing.updateMany({
        where: {
          id: dto.id, // Match single ID as per gRPC definition
          accountId: dto.ownerId,
        },
        data: { status: 'ARCHIVED' },
      });

      if (result.count === 0) return BaseResponseDto.fail('Listing not found or unauthorized', 'NOT_FOUND');

      return BaseResponseDto.ok(null, 'Archived successfully');
    } catch (error) {
      return BaseResponseDto.fail('Archive failed', 'ERROR');
    }
  }

  // ======================================================
  // VIEWINGS
  // ======================================================

  async scheduleViewing(dto: ScheduleViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Validate the House Listing
        const listing = await tx.houseListing.findUnique({
          where: { id: dto.houseId },
          select: { status: true },
        });

        if (!listing) {
          return BaseResponseDto.fail('The specified house listing does not exist.', 'NOT_FOUND');
        }

        if (listing.status !== 'AVAILABLE') {
          return BaseResponseDto.fail(`This listing is currently ${listing.status} and not available for viewings.`, 'LISTING_NOT_AVAILABLE');
        }

        // Optional: Check for duplicate viewings for the same user and house
        const viewerId = dto.targetViewerId || dto.callerId;
        const existingViewing = await tx.houseViewing.findFirst({
            where: {
                houseId: dto.houseId,
                viewerId: viewerId,
            }
        });

        if (existingViewing) {
            return BaseResponseDto.fail('You have already scheduled a viewing for this property.', 'ALREADY_SCHEDULED');
        }

        // 2. Create the Viewing record
        const viewing = await tx.houseViewing.create({
          data: {
            houseId: dto.houseId,
            viewerId: viewerId,
            viewingDate: new Date(dto.viewingDate),
            status: 'SCHEDULED',
            notes: dto.notes || '',
            bookedById: dto.callerId,
          },
        });

        return BaseResponseDto.ok(viewing as unknown as HouseViewingResponseDto, 'Viewing scheduled successfully.');
      });
    } catch (error: unknown) {
      // e.g., Foreign key constraint failed on houseId
      if ((error as { code?: string }).code === 'P2003') {
        this.logger.error(`ScheduleViewing FK Error: ${(error as Error).message}`);
        return BaseResponseDto.fail('Invalid data provided for scheduling.', 'BAD_REQUEST');
      }
      this.logger.error(`ScheduleViewing Transaction Error: ${(error as Error).message}`, (error as Error).stack);
      return BaseResponseDto.fail('An unexpected error occurred while scheduling the viewing.', 'ERROR');
    }
  }

  // ======================================================
  // MAPPER
  // ======================================================

  private mapToDto(listing: HouseListingWithRelations): HouseListingResponseDto {
    return {
      id: listing.id,
      externalId: listing.externalId,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      currency: listing.currency,
      status: listing.status,
      listingType: listing.listingType,
      bedrooms: listing.bedrooms ?? undefined,
      bathrooms: listing.bathrooms ?? undefined,
      locationCity: listing.locationCity,
      locationNeighborhood: listing.locationNeighborhood ?? undefined,
      accountName: listing.accountName,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      amenities: listing.amenities,
      isFurnished: listing.isFurnished,
      address: listing.address ?? undefined,
      imageUrl: listing.images?.find((i) => i.isMain)?.url ?? undefined,
      images: listing.images || [],
      category: {
        id: listing.categoryId || '',
        name: listing.category?.name || 'Property',
        slug: listing.category?.slug || '',
        vertical: 'HOUSING',
      },
      creator: {
        id: listing.creatorId,
        fullName: listing.creatorName,
      },
      account: {
        id: listing.accountId,
        name: listing.accountName,
      },
    };
  }
}
