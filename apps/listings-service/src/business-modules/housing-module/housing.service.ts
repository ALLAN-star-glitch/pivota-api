import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  HouseListingResponseDto,
  BaseResponseDto,
  UserResponseDto,
  GetUserByUserUuidDto,
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
import { BaseUserResponseGrpc } from '@pivota-api/interfaces';

// Internal interface to represent the Prisma result with included relations
interface HouseListingWithImages {
  id: string;
  externalId: string;
  ownerId: string;
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
    houseId: string;
  }>;
}

interface UserServiceGrpc {
  getUserProfileByUuid(
    data: GetUserByUserUuidDto,
  ): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}

@Injectable()
export class HousingService implements OnModuleInit {
  private readonly logger = new Logger(HousingService.name);
  private userGrpcService: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_GRPC') private readonly userService: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userGrpcService =
      this.userService.getService<UserServiceGrpc>('UserService');
  }

  private getGrpcService(): UserServiceGrpc {
    if (!this.userGrpcService) {
      this.userGrpcService =
        this.userService.getService<UserServiceGrpc>('UserService');
    }
    return this.userGrpcService;
  }

  // ======================================================
  // CREATE HOUSE LISTING
  // ======================================================
 async createHouseListing(
    dto: CreateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      // 1. Validate that the Category exists and belongs to the HOUSING vertical
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

      // 2. Create the listing in the database
      const created = (await this.prisma.houseListing.create({
        data: {
          ownerId: dto.ownerId,
          title: dto.title,
          description: dto.description,
          // Use categoryId instead of raw 'type'
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
          category: true // Include category metadata in the return
        },
      })) as HouseListingWithImages;

      // 3. Fetch Owner details via gRPC
      const ownerRes = await firstValueFrom(
        this.getGrpcService().getUserProfileByUuid({
          userUuid: created.ownerId,
        }),
      );

      if (!ownerRes || !ownerRes.user) {
        throw new Error('Owner profile not found via User Service');
      }

      return {
        success: true,
        message: 'House listing created successfully',
        code: 'CREATED',
        data: this.mapToResponseDto(created, ownerRes.user),
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
      const listing = await this.prisma.houseListing.findUnique({
        where: { id: dto.id },
        include: { images: true, category: true },
      }) as HouseListingWithImages | null;

      if (!listing) {
        return {
          success: false,
          message: 'Listing not found',
          code: 'NOT_FOUND',
          data: null,
        };
      }

      const ownerRes = await firstValueFrom(
        this.getGrpcService().getUserProfileByUuid({
          userUuid: listing.ownerId,
        }),
      );

      return {
        success: true,
        message: 'Listing fetched successfully',
        code: 'FETCHED',
        data: this.mapToResponseDto(listing, ownerRes.user),
      };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // GET LISTINGS BY OWNER (DASHBOARD)
  // ======================================================
  async getListingsByOwner(
    dto: GetListingsByOwnerDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const listings = await this.prisma.houseListing.findMany({
      where: { ownerId: dto.ownerId },
      include: { 
        images: true, 
        category: true // Mandatory for the mapper
      },
      orderBy: { createdAt: 'desc' },
    }) as HouseListingWithImages[];

    // Reuse the central mapping logic
    const data = listings.map(listing => 
      this.mapToResponseDto(listing, {
        uuid: listing.ownerId,
        firstName: 'Owner', // Placeholder logic remains
        lastName: '',
        phone: '',
      } as UserResponseDto)
    );

    return {
      success: true,
      message: 'Owner listings fetched successfully',
      code: 'FETCHED',
      data,
    };
  }

  // ======================================================
  // ADVANCED SEARCH & DISCOVERY
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

      const listings = await this.prisma.houseListing.findMany({
        where,
        include: { images: true, category: true },
        orderBy: { createdAt: 'desc' },
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
      }) as unknown as HouseListingWithImages[];

      return {
        success: true,
        message: 'Listings fetched successfully',
        code: 'FETCHED',
        data: listings as unknown as HouseListingResponseDto[],
      };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        code: 'SEARCH_ERROR',
        data: null,
      };
    }
  }

  // ======================================================
  // UPDATE LISTING DETAILS (Unified User & Admin Logic)
  // ======================================================
  async updateHouseListing(  
  dto: UpdateHouseListingGrpcRequestDto
): Promise<BaseResponseDto<HouseListingResponseDto>> {
  // 1. Fetch the listing + check existence
  const listing = await this.prisma.houseListing.findUnique({ 
    where: { id: dto.listingId } 
  });

  if (!listing) {
    return { success: false, message: 'Listing not found', code: 'NOT_FOUND', data: null };
  }

  // 2. Authorization Logic (Owner OR Admin)
  const isOwner = listing.ownerId === dto.callerId;
  const isAdmin = ['SuperAdmin', 'SystemAdmin'].includes(dto.userRole);

  if (!isOwner && !isAdmin) {
    return { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED', data: null };
  }

  // 3. FETCH THE ACTUAL OWNER DATA
  // We use listing.ownerId (from DB) to ensure we get the real landlord's profile
  const getGrpcService = this.getGrpcService();
  const ownerRes = await firstValueFrom(
    getGrpcService.getUserProfileByUuid({ userUuid: listing.ownerId })
  );

  if (!ownerRes || !ownerRes.user) {
    return { success: false, message: 'Owner profile not found', code: 'OWNER_NOT_FOUND', data: null };
  }

  // 4. Perform the Update
  const updated = await this.prisma.houseListing.update({
    where: { id: dto.listingId },
    data: { ...dto.data },
    include: { images: true, category: true },
  }) as unknown as HouseListingWithImages;

  // 5. Map with BOTH required arguments
  return {
    success: true,
    message: isAdmin ? 'Updated by Admin' : 'Updated successfully',
    code: 'UPDATED',
    data: this.mapToResponseDto(updated, ownerRes.user), // Error fixed!
  };
}

  // ======================================================
  // UPDATE LISTING STATUS (LIFECYCLE)
  // ======================================================
  async updateListingStatus(
    dto: UpdateHouseListingStatusDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const listing = await this.prisma.houseListing.findUnique({
      where: { id: dto.id },
    });

    if (!listing || listing.ownerId !== dto.ownerId) {
      return {
        success: false,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        data: null,
      };
    }

    const updated = await this.prisma.houseListing.update({
      where: { id: dto.id },
      data: { status: dto.status },
      include: { images: true, category: true},
    }) as unknown as HouseListingWithImages;

    return {
      success: true,
      message: `Listing status updated to ${dto.status}`,
      code: 'UPDATED',
      data: updated as unknown as HouseListingResponseDto,
    };
  }

  // ======================================================
  // ARCHIVE (SOFT DELETE)
  // ======================================================
  async archiveHouseListing(
    dto: ArchiveHouseListingsGrpcRequestDto
  ): Promise<BaseResponseDto<null>> {
    const listing = await this.prisma.houseListing.findUnique({
      where: { id: dto.id },
    });

    if (!listing || listing.ownerId !== dto.ownerId) {
      return {
        success: false,
        message: 'Unauthorized',
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
      message: 'Listing archived',
      code: 'ARCHIVED',
      data: null,
    };
  }

 // ======================================================
  // SCHEDULE A VIEWING
  // ======================================================
 // ======================================================
  // SCHEDULE A VIEWING
  // ======================================================
  async scheduleViewing(
    dto: ScheduleViewingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    try {
      // 1. Fetch the house
      const house = await this.prisma.houseListing.findUnique({
        where: { id: dto.houseId },
      });

      if (!house || house.status !== 'AVAILABLE') {
        return { success: false, message: 'House not available', code: 'NOT_AVAILABLE', data: null };
      }

      // 2. ROLE CHECK: Booking for someone else?
      const isAdmin = ['SuperAdmin', 'SystemAdmin'].includes(dto.userRole);
      
      // If a targetViewerId is provided and it's DIFFERENT from the caller...
      if (dto.targetViewerId && dto.targetViewerId !== dto.callerId) {
        // ...then the caller MUST be an Admin
        if (!isAdmin) {
          return {
            success: false,
            message: 'You do not have permission to schedule viewings for other users.',
            code: 'FORBIDDEN',
            data: null,
          };
        }
      }

      // 3. Determine Final Viewer ID
      // If we passed the check above, we can safely trust the logic below
      const finalViewerId = (isAdmin && dto.targetViewerId) 
        ? dto.targetViewerId 
        : dto.callerId;

      // 4. Safety Check: Landlord check
      if (house.ownerId === finalViewerId) {
        return {
          success: false,
          message: 'Landlords cannot schedule viewings for their own listings.',
          code: 'FORBIDDEN',
          data: null,
        };
      }

      // 5. Create Viewing
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
        message: isAdmin && dto.targetViewerId !== dto.callerId 
          ? 'Viewing scheduled for client' 
          : 'Viewing scheduled successfully',
        code: 'SCHEDULED',
        data: viewing as unknown as HouseViewingResponseDto,
      };

    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`ScheduleViewing Error: ${err.message}`);
      return { success: false, message: 'Failed to schedule viewing', code: 'ERROR', data: null };
    }
  }

  // ======================================================
  // UTILITY MAPPER
  // ======================================================
 private mapToResponseDto(
    listing: HouseListingWithImages,
    owner: UserResponseDto,
  ): HouseListingResponseDto {
    return {
      id: listing.id,
      externalId: listing.externalId,
      title: listing.title,
      description: listing.description,
      
      // The category object is now the single source of truth for 'type'
      category: {
        id: listing.categoryId,
        name: listing.category?.name || 'Property',
        slug: listing.category?.slug || '',
        vertical: 'HOUSING',
      },

      listingType: listing.listingType, // e.g., 'RENTAL' or 'SALE'
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
      
      // Transform Prisma images to DTO format
      images: (listing.images || []).map(img => ({
        id: img.id,
        url: img.url,
        isMain: img.isMain,
      })),
      
      // Transform gRPC User data to DTO format
      owner: {
        id: owner.uuid,
        fullName: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner',
        phone: owner.phone,
      },

      // Computed hero image for quick UI rendering
      imageUrl: listing.images?.find(img => img.isMain)?.url ?? undefined,
    };
  }
}