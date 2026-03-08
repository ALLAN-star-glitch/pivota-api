/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

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
  ScheduleAdminViewingGrpcRequestDto,
  GetUserByUserUuidDto,
  UserProfileResponseDto,
} from '@pivota-api/dtos';

import { Prisma,   HouseListing, HouseViewing, PrismaClient  } from '../../../../generated/prisma/client';
import { ClientGrpc, ClientKafka, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { HousingViewEvent } from '@pivota-api/interfaces';
import { HousingTrackingService } from './housing-tracking.service';


interface ProfileServiceGrpc {
  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserProfileResponseDto> | null>;
}
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
  latitude: number | null;
  longitude: number | null;
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
  squareFootage?: number | null;
  yearBuilt?: number | null;
  propertyType?: string | null;
}

// Type for user flow - needs all fields including ownerEmail
type HouseWithFullInfo = Pick<HouseListing, 
  'id' | 'status' | 'title' | 'accountId' | 'accountName' | 'creatorId' | 'locationCity' | 'ownerEmail'
>;

// Type for admin flow - creatorId is optional, but include ownerEmail
type HouseWithBasicInfo = Pick<HouseListing, 
  'id' | 'status' | 'title' | 'accountId' | 'accountName' | 'locationCity' | 'ownerEmail'
> & { creatorId?: string }; // Make creatorId optional
interface AdminMetadata {
  ipAddress?: string;
  userAgent?: string;
  scheduledAt: string;
  isAdminBooking: boolean;
}

interface ViewingEventData {
  viewingId: string;
  houseId: string;
  houseTitle: string;
  viewerId: string;
  bookedById: string;
  viewingDate: string;
  location: string;
  notes?: string;
  timestamp: string;
  isAdminBooking?: boolean;
  adminMetadata?: AdminMetadata;
}  

interface NotificationEmailData {
  type: string;
  recipientId: string;
  recipientEmail: string | null;  // Add this
  recipientName: string;          // Add this
  template: string;
  data: {
    houseTitle: string;
    viewingDate: string;
    houseImageUrl?: string;
    location: string;
    notes?: string;
    bookedBy?: string;
    viewerName?: string;      // Viewer's name
    viewerEmail?: string;     // Viewer's email - ADDED 
    bookedById?: string;
    isAdminBooking?: boolean;
  };
}

interface AnalyticsEventData {
  eventType: string;
  viewingId: string;
  houseId: string;
  userId: string;
  bookedById: string;
  userRole: string;
  isAdminBooking?: boolean;
  timestamp: string;
}


@Injectable()
export class HousingService {
  private readonly logger = new Logger(HousingService.name);
  private readonly profileService: ProfileServiceGrpc;  

  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    @Inject('NOTIFICATION_EVENT_BUS') 
    private readonly notificationBus: ClientProxy, 

    @Inject('PROFILE_SERVICE')  
    private readonly profileServiceClient: ClientGrpc,  
    private readonly trackingService: HousingTrackingService,
  ) {
    this.profileService = this.profileServiceClient.getService<ProfileServiceGrpc>('ProfileService'); 
  }

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
          subCategoryId: dto.subCategoryId,
          listingType: dto.listingType,
          price: dto.price,
          ownerEmail: dto.ownerEmail,
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
        'House Posted successfully',
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
    const where: Prisma.HouseListingWhereInput = {};

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    
    // Check for specific Prisma errors (e.g., invalid UUID format in accountId)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2023') { // Inconsistent column data (often bad UUID)
        this.logger.warn(`⚠️ Admin provided invalid UUID format: ${dto.accountId}`);
        return BaseResponseDto.fail('Invalid Account ID format provided', 'BAD_REQUEST');
      }
    }

    this.logger.error(`❌ Admin Fetch Failure: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    
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

  } catch (error) {
    // 4. Categorize Errors
    this.logger.error(`❌ Database Error while fetching listings for ${ownerId}: ${error.message}`, error.stack);

    // Specific Prisma Error handling (Optional but recommended)
    if (error.code === 'P2021') {
      return BaseResponseDto.fail('Internal database table missing', 'DATABASE_CONFIG_ERROR');
    }

    return BaseResponseDto.fail(
      'An unexpected error occurred while retrieving your listings', 
      'INTERNAL_SERVER_ERROR'
    );
  }
}


// Keep this pure - just fetches data
async getHouseListingById(
  id: string
): Promise<HouseListingWithRelations | null> {
  return this.prisma.houseListing.findUnique({
    where: { id },
    include: { images: true, category: true },
  }) as unknown as HouseListingWithRelations | null;
}

// This method combines fetching the listing and tracking the view in one call, but keeps tracking non-blocking 
async getHouseListingWithTracking(
  dto: GetHouseListingByIdDto
): Promise<BaseResponseDto<HouseListingResponseDto>> {
  try {
    const listing = await this.getHouseListingById(dto.id);
    if (!listing) return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');

    // Track view using the tracking service (fire and forget)
    if (dto.context?.userId) {
      // Use setTimeout to make it truly non-blocking
      setTimeout(() => {
        try {
          this.trackingService.trackView(
            dto.context.userId,
            listing.id,
            {
              ...listing,
              // Ensure propertyType is properly typed
              propertyType: listing.propertyType as 'APARTMENT' | 'HOUSE' | 'CONDO' | 'TOWNHOUSE' | 'VILLA' | 'STUDIO' | undefined,
              images: listing.images
            },
            dto.context
          );
        } catch (error) {
          this.logger.error(`Tracking failed: ${error.message}`);
        }
      }, 0);
    }

    return BaseResponseDto.ok(this.mapToDto(listing), 'Listing fetched successfully', 'OK');
  } catch (error) {
    this.logger.error(`❌ getHouseListingWithTracking failed: ${error.message}`);
    return BaseResponseDto.fail('Fetch failed', 'ERROR');
  }
}


async searchListings(dto: SearchHouseListingsDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
  try {
    const where: Prisma.HouseListingWhereInput = {
      status: 'AVAILABLE',
    };

    // 1. Basic Filters
    if (dto.city) {
      where.locationCity = dto.city;
    }

    if (dto.listingType) {
      where.listingType = dto.listingType;
    }
    

    // 2. Hierarchical Category Filtering
    // If a user clicks a main category in the nav, filter by categoryId
    if (dto.categoryId) {
      where.categoryId = dto.categoryId;
    }

    // If a user drills down into a subcategory, filter by subCategoryId
    if (dto.subCategoryId) {
      where.subCategoryId = dto.subCategoryId;
    }

    // 3. Price Range
    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      where.price = {
        ...(dto.minPrice !== undefined && { gte: dto.minPrice }),
        ...(dto.maxPrice !== undefined && { lte: dto.maxPrice }),
      };
    }

    // 4. Property Specifics
    if (dto.bedrooms !== undefined) {
      where.bedrooms = { gte: dto.bedrooms };
    }

    const listings = await this.prisma.houseListing.findMany({
      where,
      include: { 
        images: true, 
        category: true,
        subCategory: true // Included to support the shared nav/breadhousing logic
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 20,
      skip: dto.offset ?? 0,
    });

    // Track search event (fire and forget)
    if (dto.context?.userId) {
      setTimeout(() => {
        try {
          this.trackingService.trackSearch(
            dto.context.userId,
            dto,
            listings.length,
            dto.context
          );
        } catch (error) {
          this.logger.error(`Search tracking failed: ${error.message}`);
        }
      }, 0);
    }

    return BaseResponseDto.ok(listings.map((l) => this.mapToDto(l)));
  } catch (error) {
    this.logger.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return BaseResponseDto.fail('Search failed', 'ERROR');
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
    const listing = await this.prisma.houseListing.findUnique({
      where: { id: dto.listingId },
    });

    if (!listing) return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');

    if (!isAdmin && listing.creatorId !== dto.callerId)
      return BaseResponseDto.fail('Unauthorized', 'UNAUTHORIZED');

    // Destructure to separate metadata from the actual update fields
    const { listingId, callerId, userRole, ...updateFields } = dto;

    const updated = await this.prisma.houseListing.update({
      where: { id: listingId },
      data: updateFields, // Pass the remaining fields directly
      include: { images: true, category: true },
    }) as unknown as HouseListingWithRelations;

    return BaseResponseDto.ok(this.mapToDto(updated));
  } catch (error) {
    return BaseResponseDto.fail('Update failed', 'ERROR');
  }
}

  async updateListingStatus(dto: UpdateHouseListingStatusDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      const listing = await this.prisma.houseListing.findUnique({
        where: { id: dto.id }, // Corrected property name from listingId to id
      });

      if (!listing) return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');

      // Ensure the owner (Account) is the one updating the status
      if (listing.accountId !== dto.ownerId)
        return BaseResponseDto.fail('Unauthorized to change status', 'UNAUTHORIZED');

      const updated = await this.prisma.houseListing.update({
        where: { id: dto.id },
        data: { status: dto.status },
        include: { images: true, category: true },
      }) as unknown as HouseListingWithRelations;

      return BaseResponseDto.ok(this.mapToDto(updated));
    } catch (error) {
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

/**
 * 👤 USER FLOW - Schedule viewing (with full validation)
 * - Checks house availability
 * - Validates future dates
 * - Prevents double-booking
 * - Standard notifications
 */
async scheduleViewing(dto: ScheduleViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {
  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Check if house exists with all required details
      const house = await this.prisma.houseListing.findUnique({
        where: { id: dto.houseId },
        select: { 
          id: true, 
          status: true, 
          title: true,
          accountId: true,
          accountName: true,
          creatorId: true,
          locationCity: true,
          ownerEmail: true,
          // Get more house details for tracking
          price: true,
          bedrooms: true,
          bathrooms: true,
          locationNeighborhood: true,
          listingType: true,
          amenities: true,
          isFurnished: true,
          categoryId: true,
          category: {
            select: { slug: true }
          },
          squareFootage: true,
          yearBuilt: true,
          propertyType: true,
          images: {  // Get the main image with isMain field
            where: { isMain: true },
            take: 1,
            select: { 
              url: true,
              isMain: true // Add isMain to match the expected type
            }
          }
        }
      });

      if (!house) {
        return BaseResponseDto.fail('House not found', 'NOT_FOUND');
      }

      // PREVENT SELF-VIEWING: Check if user is trying to view their own property
      if (house.creatorId === dto.callerId || house.accountId === dto.callerId) {
        this.logger.warn(`🚫 User ${dto.callerId} attempted to schedule viewing for their own property ${dto.houseId}`);
        return BaseResponseDto.fail(
          'You cannot schedule a viewing for your own property',
          'FORBIDDEN'
        );
      }

      // Validate house is available
      if (house.status !== 'AVAILABLE') {
        return BaseResponseDto.fail(
          `House is not available for viewing (current status: ${house.status})`,
          'CONFLICT'
        );
      }

      const viewingDate = new Date(dto.viewingDate);
      const now = new Date();
      
      // Validate future date
      if (viewingDate < now) {
        return BaseResponseDto.fail(
          'Viewing date must be in the future',
          'INVALID_DATE'
        );
      }

      // Check for double-booking (within 1 hour window)
      const conflictingViewing = await this.prisma.houseViewing.findFirst({
        where: {
          houseId: dto.houseId,
          viewingDate: {
            gte: new Date(viewingDate.getTime() - 30 * 60000),
            lte: new Date(viewingDate.getTime() + 30 * 60000)
          },
          status: { in: ['SCHEDULED', 'CONFIRMED'] }
        }
      });

      if (conflictingViewing) {
        return BaseResponseDto.fail(
          'This time slot is already booked. Please choose another time.',
          'CONFLICT'
        );
      }

      // Create viewing in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const viewing = await tx.houseViewing.create({
          data: {
            houseId: dto.houseId,
            viewerId: dto.targetViewerId || dto.callerId,
            viewingDate: viewingDate,
            status: 'SCHEDULED',
            notes: dto.notes || '',
            bookedById: dto.callerId,
          },
        });
        return viewing;
      }, {
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });


     // TRACK VIEWING SCHEDULED EVENT (fire and forget)
    setTimeout(() => {
      try {
        // Format images to match HouseListingData interface
        const formattedImages = house.images?.map(img => ({
          url: img.url,
          isMain: img.isMain
        }));

        this.trackingService.trackViewingScheduled(
          dto.callerId,
          house.id,
          result.id,
          viewingDate,
          {
            id: house.id, // Add the missing id property
            price: house.price,
            bedrooms: house.bedrooms,
            bathrooms: house.bathrooms,
            locationCity: house.locationCity,
            locationNeighborhood: house.locationNeighborhood,
            listingType: house.listingType,
            amenities: house.amenities || [],
            isFurnished: house.isFurnished || false,
            categoryId: house.categoryId,
            category: house.category ? { slug: house.category.slug } : null,
            squareFootage: house.squareFootage,
            yearBuilt: house.yearBuilt,
            propertyType: house.propertyType as 'APARTMENT' | 'HOUSE' | 'CONDO' | 'TOWNHOUSE' | 'VILLA' | 'STUDIO' | undefined,
            images: formattedImages
          },
         dto.context
        );
      } catch (error) {
        this.logger.error(`Viewing tracking failed: ${error.message}`);
      }
    }, 0);

      // Send notifications (user flow)
      await this.sendUserViewingNotifications(result, house, dto);
      
      this.logger.log(`✅ Viewing scheduled successfully: ${result.id}`);
      
      return BaseResponseDto.ok(
        result as unknown as HouseViewingResponseDto,
        'Viewing scheduled successfully',
        'CREATED'
      );

    } catch (error) {
      // Handle unique constraint violation (race condition)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return BaseResponseDto.fail(
            'This time slot was just booked by someone else. Please choose another time.',
            'CONFLICT'
          );
        }
      }

      // Retry on transient errors
      if (attempt < MAX_RETRIES && this.isTransientError(error)) {
        const backoffMs = 100 * Math.pow(2, attempt - 1);
        this.logger.warn(`Retry attempt ${attempt} after ${backoffMs}ms due to: ${(error as Error).message}`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      // Log and throw if all retries failed
      if (attempt === MAX_RETRIES) {
        this.logger.error(`❌ ScheduleViewing failed after ${MAX_RETRIES} attempts: ${(error as Error).message}`);
        throw error;
      }
    }
  }
  
  return BaseResponseDto.fail('Viewing scheduling failed after retries', 'INTERNAL_ERROR');
}
/**
 * 🔐 ADMIN FLOW - Schedule viewing (with bypass capabilities)
 * - Minimal validation (only house existence)
 * - Can book non-available houses
 * - Can book past dates
 * - No double-booking check
 * - Admin audit trail
 */
async scheduleAdminViewing(dto: ScheduleAdminViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {
  try { 
    // Check if house exists
    const house = await this.prisma.houseListing.findUnique({
      where: { id: dto.houseId },
      select: { 
        id: true, 
        title: true,
        accountId: true,
        accountName: true,
        locationCity: true,
        status: true,
        ownerEmail: true,
        creatorId: true,
        images: {
          where: { isMain: true },
          take: 1,
          select: { url: true }
        }
      }
    });

    if (!house) {
      return BaseResponseDto.fail('House not found', 'NOT_FOUND');
    }

          // PREVENT BOOKING FOR THE PROPERTY OWNER/CREATOR
      // Check if the target viewer is actually the creator/owner of the property
      if (house.creatorId === dto.targetViewerId || house.accountId === dto.targetViewerId) {
        this.logger.warn(`👑 Admin ${dto.callerId} attempted to book viewing for property owner ${dto.targetViewerId} on their own property ${dto.houseId}`);
        return BaseResponseDto.fail(
          'Cannot schedule a viewing for the property owner on their own listing',
          'FORBIDDEN'
        );
      }

    // Log warnings for non-standard bookings
    if (house.status !== 'AVAILABLE') {
      this.logger.warn(`👑 Admin booking for non-AVAILABLE house: ${house.id} (status: ${house.status})`);
    }

    const viewingDate = new Date(dto.viewingDate);
    const now = new Date();
    
    if (viewingDate < now) {
      this.logger.warn(`👑 Admin booking for past date: ${viewingDate.toISOString()}`);
    }

    // VALIDATE VIEWER AND FETCH DETAILS FROM PROFILE SERVICE
    let viewerEmail = dto.targetViewerEmail;
    let viewerName = dto.targetViewerName;
    
    try {
      this.logger.log(`🔍 Validating viewer ID: ${dto.targetViewerId} with profile service`);
      
      // Call profile service to get user details
      const profile = await firstValueFrom(
        this.profileService.getUserProfileByUuid({ userUuid: dto.targetViewerId })
      );
      
      if (!profile?.data?.user) {
        this.logger.error(`❌ Viewer not found in profile service: ${dto.targetViewerId}`);
        return BaseResponseDto.fail(
          `Viewer with ID ${dto.targetViewerId} not found`, 
          'NOT_FOUND'
        );
      }
      
      // Use the profile data (override any provided values with the source of truth)
      viewerEmail = profile.data.user.email;
      viewerName = `${profile.data.user.firstName} ${profile.data.user.lastName}`.trim();
      
      this.logger.log(`✅ Viewer validated: ${viewerName} (${viewerEmail})`);
      
    } catch (profileError) {
      this.logger.error(`❌ Error validating viewer with profile service: ${profileError.message}`);
      return BaseResponseDto.fail(
        'Unable to validate viewer. Please try again.',
        'PROFILE_SERVICE_ERROR'
      );
    }

    // Create viewing
    const result = await this.prisma.houseViewing.create({
      data: {
        houseId: dto.houseId,
        viewerId: dto.targetViewerId,
        viewingDate: viewingDate,
        status: 'SCHEDULED',
        notes: dto.notes 
          ? `[Admin: ${dto.callerName}] ${dto.notes}`
          : `Scheduled by admin ${dto.callerName}`,
        bookedById: dto.callerId,
      },
    });

    // Create enriched DTO with fetched viewer details
    const enrichedDto = {
      ...dto,
      targetViewerEmail: viewerEmail,
      targetViewerName: viewerName
    };

    // Send notifications with admin context
    await this.sendAdminViewingNotifications(result, house, enrichedDto, dto.adminMetadata);

    // Store admin audit log
    await this.prisma.adminAuditLog.create({
      data: {
        adminId: dto.callerId,
        action: 'SCHEDULE_VIEWING',
        targetId: result.id,
        targetType: 'HOUSE_VIEWING',
        metadata: dto.adminMetadata as Prisma.InputJsonValue || {},
        timestamp: new Date()
      }
    });

    this.logger.log(`👑 ADMIN ${dto.callerId} scheduled viewing ${result.id} for user ${dto.targetViewerId}`);
    
    return BaseResponseDto.ok(
      result as unknown as HouseViewingResponseDto,
      'Admin viewing scheduled successfully',
      'CREATED'
    );

  } catch (error) {
    this.logger.error(`❌ ScheduleAdminViewing failed: ${(error as Error).message}`, (error as Error).stack);
    return BaseResponseDto.fail('Admin viewing scheduling failed', 'INTERNAL_ERROR');
  }
}

/**
 * Send notifications for user-flow viewing
 */
/**
 * Send notifications for user-flow viewing
 */
private async sendUserViewingNotifications(
  viewing: HouseViewing,
  house: HouseWithFullInfo & { images?: { url: string }[] }, // Update type
  dto: ScheduleViewingGrpcRequestDto
): Promise<void> {
  const viewerId = dto.callerId;
  const viewerEmail = dto.callerEmail;
  const viewerName = dto.callerName;
  const viewingDateStr = viewing.viewingDate.toLocaleString();
  
  // Get the main image URL
  const houseImageUrl = house.images?.[0]?.url;

  // Domain event
  this.notificationBus.emit('viewing.scheduled', {
    viewingId: viewing.id,
    houseId: viewing.houseId,
    houseTitle: house.title,
    viewerId: viewerId,
    viewerEmail: viewerEmail,
    viewerName: viewerName,
    bookedById: dto.callerId,
    bookedByEmail: dto.callerEmail,
    bookedByName: dto.callerName,
    viewingDate: viewing.viewingDate.toISOString(),
    location: house.locationCity,
    notes: viewing.notes || undefined,
    houseImageUrl: houseImageUrl,
    timestamp: new Date().toISOString(),
    isAdminBooking: false
  });

  // Email to viewer
  const viewerEmailData: NotificationEmailData = {
    type: 'VIEWING_SCHEDULED',
    recipientId: viewerId,
    recipientEmail: viewerEmail,
    recipientName: viewerName,
    template: 'viewing-scheduled-viewer',
    data: {
      houseTitle: house.title,
      houseImageUrl: houseImageUrl,
      viewingDate: viewingDateStr,
      location: house.locationCity,
      notes: viewing.notes || undefined,
      bookedBy: 'You'
    }
  };
  this.notificationBus.emit('notification.email', viewerEmailData);

  // Email to property owner
  if (house.accountId && house.ownerEmail) {
    const ownerEmailData: NotificationEmailData = {
      type: 'VIEWING_REQUESTED',
      recipientId: house.accountId,
      recipientEmail: house.ownerEmail,
      recipientName: house.accountName || 'Property Owner',
      template: 'viewing-scheduled-owner',
      data: {
        houseTitle: house.title,
        houseImageUrl: houseImageUrl,
        viewingDate: viewingDateStr,
        location: house.locationCity,
        notes: viewing.notes || undefined,
        viewerName: viewerName,
        viewerEmail: viewerEmail,
        bookedById: dto.callerId,
        isAdminBooking: false
      }
    };
    this.notificationBus.emit('notification.email', ownerEmailData);
    this.logger.log(`📧 Owner notification sent to ${house.ownerEmail} for viewing ${viewing.id}`);
  }

  // Analytics
  this.kafkaClient.emit('analytics.event', {
    eventType: 'viewing_scheduled',
    viewingId: viewing.id,
    houseId: viewing.houseId,
    userId: viewerId,
    userEmail: viewerEmail,
    bookedById: dto.callerId,
    bookedByEmail: dto.callerEmail,
    userRole: dto.userRole,
    isAdminBooking: false,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send notifications for admin-flow viewing
 */
/**
 * Send notifications for admin-flow viewing
 */
/**
 * Send notifications for admin-flow viewing
 */
private async sendAdminViewingNotifications(
  viewing: HouseViewing,
  house: HouseWithBasicInfo & { images?: { url: string }[] },
  dto: ScheduleAdminViewingGrpcRequestDto,
  adminMetadata?: AdminMetadata
): Promise<void> {
  const viewerId = dto.targetViewerId;
  const viewerEmail = dto.targetViewerEmail;
  const viewerName = dto.targetViewerName;
  const viewingDateStr = viewing.viewingDate.toLocaleString();
  
  // DEBUG: Log what we're about to send
  this.logger.log(`🔍 DEBUG - Admin viewing notification:`);
  this.logger.log(`   viewerId: ${viewerId}`);
  this.logger.log(`   viewerEmail: ${viewerEmail}`);
  this.logger.log(`   viewerName: ${viewerName}`);
  this.logger.log(`   callerEmail: ${dto.callerEmail}`);
  this.logger.log(`   callerName: ${dto.callerName}`);
  
  // Get the main image URL (if available)
  const houseImageUrl = house.images?.[0]?.url;

  // Domain event with admin metadata
  this.notificationBus.emit('viewing.scheduled', {
    viewingId: viewing.id,
    houseId: viewing.houseId,
    houseTitle: house.title,
    viewerId: viewerId,
    viewerEmail: viewerEmail,
    viewerName: viewerName,
    bookedById: dto.callerId,
    bookedByEmail: dto.callerEmail,
    bookedByName: dto.callerName,
    viewingDate: viewing.viewingDate.toISOString(),
    location: house.locationCity,
    notes: viewing.notes || undefined,
    houseImageUrl: houseImageUrl,
    timestamp: new Date().toISOString(),
    isAdminBooking: true,
    adminMetadata: adminMetadata
  });

  // Email to viewer (admin template)
  if (!viewerEmail) {
    this.logger.error(`❌ Cannot send viewer email: viewerEmail is missing for viewerId: ${viewerId}`);
    // Still continue with other notifications
  } else {
    const viewerEmailData: NotificationEmailData = {
      type: 'VIEWING_SCHEDULED_ADMIN',
      recipientId: viewerId,
      recipientEmail: viewerEmail,
      recipientName: viewerName,
      template: 'viewing-scheduled-admin-viewer',
      data: {
        houseTitle: house.title,
        houseImageUrl: houseImageUrl,
        viewingDate: viewingDateStr,
        location: house.locationCity,
        notes: viewing.notes,
        bookedBy: 'Support Team',
        viewerName: viewerName,
        viewerEmail: viewerEmail
      }
    };
    this.notificationBus.emit('notification.email', viewerEmailData);
    this.logger.log(`📧 Viewer email queued for ${viewerEmail}`);
  }

  // Email to property owner (admin template)
  if (house.accountId) {
    if ('ownerEmail' in house && house.ownerEmail) {
      const ownerEmailData: NotificationEmailData = {
        type: 'VIEWING_REQUESTED_ADMIN',
        recipientId: house.accountId,
        recipientEmail: house.ownerEmail,
        recipientName: house.accountName || 'Property Owner',
        template: 'viewing-scheduled-owner-admin',
        data: {
          houseTitle: house.title,
          houseImageUrl: houseImageUrl,
          viewingDate: viewingDateStr,
          location: house.locationCity,
          notes: viewing.notes || undefined,
          viewerName: viewerName,
          viewerEmail: viewerEmail,
          bookedById: dto.callerId,
          isAdminBooking: true
        }
      };
      this.notificationBus.emit('notification.email', ownerEmailData);
      this.logger.log(`👑 Admin owner notification sent to ${house.ownerEmail} for viewing ${viewing.id}`);
    } else {
      this.logger.debug(`👑 Owner notification would be sent to account ${house.accountId} but email is not available in house record`);
    }
  }

  // Analytics with admin flag
  this.kafkaClient.emit('analytics.event', {
    eventType: 'viewing_scheduled',
    viewingId: viewing.id,
    houseId: viewing.houseId,
    userId: viewerId,
    userEmail: viewerEmail,
    bookedById: dto.callerId,
    bookedByEmail: dto.callerEmail,
    userRole: dto.userRole,
    isAdminBooking: true,
    timestamp: new Date().toISOString()
  });
}



/**
 * Check if error is transient and should be retried
 */
private isTransientError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  
  const transientErrorCodes = [
    'P1001', // Connection error
    'P1002', // Timeout
    'P1008', // Operation timeout
    'P1017'  // Server closed connection
  ];
  
  return transientErrorCodes.includes(error.code);
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