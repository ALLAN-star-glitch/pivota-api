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
  GetHouseListingsByCategoryDto,
  PaginationDto,
  GetAllHouseListingsRequestDto,
} from '@pivota-api/dtos';

import { Prisma, HouseListing, HouseViewing } from '../../../../generated/prisma/client';
import { ClientGrpc, ClientKafka, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { HousingTrackingService } from './housing-tracking.service';
import { QueueService, RedisService, CacheKeys } from '@pivota-api/shared-redis';

interface ProfileServiceGrpc {
  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserProfileResponseDto> | null>;
}

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
  minimumLeaseTerm?: number | null;
  maximumLeaseTerm?: number | null;
  depositAmount?: number | null;
  isPetFriendly?: boolean;
  utilitiesIncluded?: boolean;
  utilitiesDetails?: string | null;
  isNegotiable?: boolean;
  titleDeedAvailable?: boolean;
}

type HouseWithFullInfo = Pick<HouseListing, 
  'id' | 'status' | 'title' | 'accountId' | 'accountName' | 'creatorId' | 'locationCity' | 'ownerEmail'
>;

type HouseWithBasicInfo = Pick<HouseListing, 
  'id' | 'status' | 'title' | 'accountId' | 'accountName' | 'locationCity' | 'ownerEmail'
> & { creatorId?: string };

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
  recipientEmail: string | null;
  recipientName: string;
  template: string;
  data: {
    houseTitle: string;
    viewingDate: string;
    houseImageUrl?: string;
    location: string;
    notes?: string;
    bookedBy?: string;
    viewerName?: string;
    viewerEmail?: string;
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

  // Cache TTLs
  private readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_TTL = {
    LISTINGS: 300, // 5 minutes - public listings
    SINGLE: 600,   // 10 minutes - individual listings
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    @Inject('NOTIFICATION_EVENT_BUS') 
    private readonly notificationBus: ClientProxy,
    @Inject('PROFILE_SERVICE')  
    private readonly profileServiceClient: ClientGrpc,  
    private readonly trackingService: HousingTrackingService,
    private readonly queue: QueueService,
    private readonly redis: RedisService,
  ) {
    this.profileService = this.profileServiceClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  // ======================================================
  // PRIVATE HELPER METHODS
  // ======================================================

  /**
   * Calculate effective TTL with smart overrides
   */
  private getEffectiveTTL(requestedTTL: number | undefined, options: any): number {
    const ttl = requestedTTL || this.DEFAULT_CACHE_TTL;
    
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      return Math.min(ttl, 60);
    }
    
    return ttl;
  }

  /**
   * Invalidate cache when listings change
   */
  private async invalidateCache(data: {
    listingId?: string;
    categoryId?: string;
    accountId?: string;
    creatorId?: string;
    allListings?: boolean;
  }): Promise<void> {
    const jobs = [];

    if (data.allListings || data.categoryId) {
      jobs.push(
        this.queue.addJob(
          'cache-housing-queue',
          'invalidate-housing-listings',
          {
            categoryId: data.categoryId,
            accountId: data.accountId,
            creatorId: data.creatorId,
          },
          {
            attempts: 3,
            removeOnComplete: true,
          }
        )
      );
    }

    if (data.listingId) {
      jobs.push(
        this.queue.addJob(
          'cache-housing-queue',
          'invalidate-single-housing',
          { listingId: data.listingId },
          {
            attempts: 3,
            removeOnComplete: true,
          }
        )
      );
    }

    await Promise.all(jobs);
    this.logger.log(`📋 Cache invalidation queued for housing: ${JSON.stringify(data)}`);
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
          minimumLeaseTerm: dto.minimumLeaseTerm,
          maximumLeaseTerm: dto.maximumLeaseTerm,
          depositAmount: dto.depositAmount,
          isPetFriendly: dto.isPetFriendly ?? false,
          utilitiesIncluded: dto.utilitiesIncluded ?? false,
          utilitiesDetails: dto.utilitiesDetails,
          isNegotiable: dto.isNegotiable ?? true,
          titleDeedAvailable: dto.titleDeedAvailable ?? false,
          squareFootage: dto.squareFootage,
          yearBuilt: dto.yearBuilt,
          propertyType: dto.propertyType,
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

      await this.invalidateCache({
        categoryId: dto.categoryId,
        allListings: true,
      });

      try {
        const mainImageUrl = dto.imageUrls && dto.imageUrls.length > 0 ? dto.imageUrls[0] : undefined;
        
        this.notificationBus.emit('listing.created.owner', {
          email: dto.ownerEmail,
          firstName: dto.creatorName?.split(' ')[0] || 'User',
          listingTitle: dto.title,
          listingId: created.id,
          listingPrice: dto.price,
          locationCity: dto.locationCity,
          listingType: dto.listingType,
          status: created.status,
          imageUrl: mainImageUrl
        });
        
        this.logger.log(`📧 Listing created email notification sent to ${dto.ownerEmail}`);
      } catch (emailError) {
        this.logger.error(`Failed to send listing created email: ${emailError.message}`);
      }

      this.trackListingMilestone(
        dto.accountId,
        dto.accountName || 'Independent',
        dto.creatorId,
        created.id,
        dto
      ).catch(error => {
        this.logger.error(`Milestone tracking error: ${error.message}`);
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
  // READ METHODS (WITH CACHING)
  // ======================================================

  async searchListings(
    dto: SearchHouseListingsDto
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    const isFurnished = dto.isFurnished === true;
    const isPetFriendly = dto.isPetFriendly === true;
    const utilitiesIncluded = dto.utilitiesIncluded === true;
    const isNegotiable = dto.isNegotiable === true;
    const titleDeedAvailable = dto.titleDeedAvailable === true;
    
    const {
      city,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      propertyType,
      categoryId,
      subCategoryId,
      limit,
      offset,
      sortBy,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    const data = {
      city,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      propertyType,
      categoryId,
      subCategoryId,
      isFurnished,
      isPetFriendly,
      utilitiesIncluded,
      isNegotiable,
      titleDeedAvailable,
      limit: limit || 20,
      offset: offset || 0,
      sortBy: sortBy || 'recent',
    };

    this.logger.log(
      `📊 searchListings: city=${data.city}, listingType=${data.listingType}, ` +
      `bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeSearchListings(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getHousingListingKey({
      categoryId: data.categoryId,
      city: data.city,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      listingType: data.listingType,
      bedrooms: data.bedrooms,
      propertyType: data.propertyType,
      isFurnished: data.isFurnished,
      sortBy: data.sortBy,
      page: page,
      limit: data.limit || 20,
    });

    try {
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: HouseListingResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} listings`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeSearchListings(data);

      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in searchListings: ${error.message}`);
      return this.executeSearchListings(data);
    }
  }

  private async executeSearchListings(data: {
    city?: string;
    listingType?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string;
    categoryId?: string;
    subCategoryId?: string;
    isFurnished?: boolean;
    isPetFriendly?: boolean;
    utilitiesIncluded?: boolean;
    isNegotiable?: boolean;
    titleDeedAvailable?: boolean;
    limit: number;
    offset: number;
    sortBy: 'recent' | 'price_asc' | 'price_desc';
  }): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    try {
      const where: Prisma.HouseListingWhereInput = {
        status: 'AVAILABLE',
      };

      if (data.city) {
        where.locationCity = data.city;
      }

      if (data.listingType) {
        where.listingType = data.listingType;
      }
      
      if (data.categoryId) {
        where.categoryId = data.categoryId;
      }

      if (data.subCategoryId) {
        where.subCategoryId = data.subCategoryId;
      }

      if (data.minPrice !== undefined || data.maxPrice !== undefined) {
        where.price = {};
        if (data.minPrice !== undefined) where.price.gte = data.minPrice;
        if (data.maxPrice !== undefined) where.price.lte = data.maxPrice;
      }

      if (data.bedrooms !== undefined) {
        where.bedrooms = { gte: data.bedrooms };
      }

      if (data.propertyType) {
        where.propertyType = data.propertyType;
      }

      if (data.isFurnished !== undefined) {
        where.isFurnished = data.isFurnished;
      }

      if (data.isPetFriendly !== undefined) {
        where.isPetFriendly = data.isPetFriendly;
      }

      if (data.utilitiesIncluded !== undefined) {
        where.utilitiesIncluded = data.utilitiesIncluded;
      }

      if (data.isNegotiable !== undefined) {
        where.isNegotiable = data.isNegotiable;
      }

      if (data.titleDeedAvailable !== undefined) {
        where.titleDeedAvailable = data.titleDeedAvailable;
      }

      let orderBy: any = {};
      switch (data.sortBy) {
        case 'price_asc':
          orderBy = { price: 'asc' };
          break;
        case 'price_desc':
          orderBy = { price: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.houseListing.count({ where });

      const listings = await this.prisma.houseListing.findMany({
        where,
        include: { 
          images: true, 
          category: true,
          subCategory: true
        },
        orderBy,
        take: data.limit,
        skip: data.offset,
      }) as unknown as HouseListingWithRelations[];

      const pagination: PaginationDto = {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      };

      return BaseResponseDto.okWithPagination(
        listings.map((l) => this.mapToDto(l)),
        pagination,
        `Found ${listings.length} listings`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail('Search failed', 'ERROR');
    }
  }

  async getHouseListingsByCategory(
    dto: GetHouseListingsByCategoryDto
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    const isFurnished = dto.isFurnished === true;
    const isPetFriendly = dto.isPetFriendly === true;
    const utilitiesIncluded = dto.utilitiesIncluded === true;
    const isNegotiable = dto.isNegotiable === true;
    const titleDeedAvailable = dto.titleDeedAvailable === true;
    
    const {
      categoryId,
      city,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      propertyType,
      limit,
      offset,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    const data = {
      categoryId,
      city,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      propertyType,
      isFurnished,
      isPetFriendly,
      utilitiesIncluded,
      isNegotiable,
      titleDeedAvailable,
      limit: limit || 20,
      offset: offset || 0,
    };

    this.logger.log(
      `📊 getHouseListingsByCategory: categoryId=${categoryId}, ` +
      `bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetHouseListingsByCategory(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getHousingListingKey({
      categoryId: data.categoryId,
      city: data.city,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      listingType: data.listingType,
      bedrooms: data.bedrooms,
      propertyType: data.propertyType,
      isFurnished: data.isFurnished,
      page: page,
      limit: data.limit || 20,
    });

    try {
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: HouseListingResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} listings for category`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetHouseListingsByCategory(data);

      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getHouseListingsByCategory: ${error.message}`);
      return this.executeGetHouseListingsByCategory(data);
    }
  }

  private async executeGetHouseListingsByCategory(data: {
    categoryId: string;
    city?: string;
    listingType?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string;
    isFurnished?: boolean;
    isPetFriendly?: boolean;
    utilitiesIncluded?: boolean;
    isNegotiable?: boolean;
    titleDeedAvailable?: boolean;
    limit: number;
    offset: number;
  }): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    try {
      const where: Prisma.HouseListingWhereInput = {
        status: 'AVAILABLE',
        categoryId: data.categoryId,
      };

      if (data.city) {
        where.locationCity = data.city;
      }

      if (data.listingType) {
        where.listingType = data.listingType;
      }

      if (data.minPrice !== undefined || data.maxPrice !== undefined) {
        where.price = {};
        if (data.minPrice !== undefined) where.price.gte = data.minPrice;
        if (data.maxPrice !== undefined) where.price.lte = data.maxPrice;
      }

      if (data.bedrooms !== undefined) {
        where.bedrooms = { gte: data.bedrooms };
      }

      if (data.propertyType) {
        where.propertyType = data.propertyType;
      }

      if (data.isFurnished !== undefined) {
        where.isFurnished = data.isFurnished;
      }

      const total = await this.prisma.houseListing.count({ where });

      const listings = await this.prisma.houseListing.findMany({
        where,
        include: { 
          images: true, 
          category: true,
          subCategory: true
        },
        orderBy: { createdAt: 'desc' },
        take: data.limit,
        skip: data.offset,
      }) as unknown as HouseListingWithRelations[];

      const pagination: PaginationDto = {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      };

      return BaseResponseDto.okWithPagination(
        listings.map((l) => this.mapToDto(l)),
        pagination,
        `Found ${listings.length} listings for category`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get listings by category: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }

    async getListingsByOwner(
    dto: GetListingsByOwnerDto
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    // Explicitly convert booleans
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    
    const {
      ownerId,
      status,
      limit = 20,
      offset = 0,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    // Prepare data for execution
    const data = {
      ownerId,
      status,
      limit,
      offset,
    };

    this.logger.log(
      `📊 getListingsByOwner: ownerId=${ownerId}, limit=${limit}, offset=${offset}, ` +
      `bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetListingsByOwner(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    // Generate cache key with pagination
    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getHousingListingKey({
      categoryId: undefined,
      city: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      listingType: undefined,
      bedrooms: undefined,
      propertyType: undefined,
      isFurnished: undefined,
      sortBy: 'recent',
      page: page,
      limit: data.limit || 20,
    });

    try {
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: HouseListingResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} listings for owner`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetListingsByOwner(data);

      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getListingsByOwner: ${error.message}`);
      return this.executeGetListingsByOwner(data);
    }
  }

   /**
   * Private method that actually executes the query for getListingsByOwner
   */
  private async executeGetListingsByOwner(data: {
    ownerId: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    try {
      if (!data.ownerId) {
        this.logger.warn(`⚠️ Attempted to fetch listings with missing ownerId`);
        return BaseResponseDto.fail('Owner ID is required to fetch listings', 'BAD_REQUEST');
      }

      const where: Prisma.HouseListingWhereInput = {
        accountId: data.ownerId,
        ...(data.status && { status: data.status }),
      };

      const total = await this.prisma.houseListing.count({ where });

      const listings = await this.prisma.houseListing.findMany({
        where,
        include: { 
          images: true, 
          category: true 
        },
        orderBy: { createdAt: 'desc' },
        take: data.limit,
        skip: data.offset,
      }) as unknown as HouseListingWithRelations[];

      if (!listings || listings.length === 0) {
        this.logger.log(`No ${data.status || ''} listings found for account: ${data.ownerId}`);
        return BaseResponseDto.ok([], 'No listings found for this account', 'SUCCESS_EMPTY');
      }

      this.logger.debug(`✅ Successfully fetched ${listings.length} listings for owner ${data.ownerId}`);
      
      const pagination: PaginationDto = {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      };

      return BaseResponseDto.okWithPagination(
        listings.map((l) => this.mapToDto(l)),
        pagination,
        `Found ${listings.length} listings for owner`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`❌ Database Error while fetching listings for ${data.ownerId}: ${error.message}`, error.stack);
      return BaseResponseDto.fail('An unexpected error occurred while retrieving your listings', 'INTERNAL_SERVER_ERROR');
    }
  }

  async getHouseListingWithTracking(
    dto: GetHouseListingByIdDto
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const bypassCache = dto.bypassCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    
    const {
      id: listingId,
      cacheTTL = this.CACHE_TTL.SINGLE,
      context,
    } = dto;

    this.logger.log(
      `📊 getHouseListingWithTracking: listingId=${listingId}, ` +
      `bypassCache=${bypassCache}, refreshCache=${refreshCache}, readOnly=${readOnly}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetHouseListingById(listingId);
      
      if (context?.seekerId && result.success && result.data) {
        this.trackViewNonBlocking(context.seekerId, listingId, result.data, context);
      }
      
      return result;
    }

    const cacheKey = CacheKeys.getSingleHousingKey(listingId);

    try {
      if (!refreshCache) {
        const cached = await this.redis.getObject<{
          data: HouseListingResponseDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          
          if (context?.seekerId) {
            this.trackViewNonBlocking(context.seekerId, listingId, cached.data, context);
          }
          
          return BaseResponseDto.ok(
            cached.data,
            'Cached: Listing retrieved',
            'OK'
          );
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetHouseListingById(listingId);

      if (!readOnly && result.success && result.data) {
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-single-housing',
          {
            listingId: listingId,
            result: result.data,
            ttl: cacheTTL,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        this.logger.debug(`📋 Queued single housing cache for: ${listingId}`);
        
        if (refreshCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              cachedAt: new Date().toISOString(),
            },
            cacheTTL
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      if (context?.seekerId && result.success && result.data) {
        this.trackViewNonBlocking(context.seekerId, listingId, result.data, context);
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getHouseListingWithTracking: ${error.message}`);
      const result = await this.executeGetHouseListingById(listingId);
      
      if (context?.seekerId && result.success && result.data) {
        this.trackViewNonBlocking(context.seekerId, listingId, result.data, context);
      }
      
      return result;
    }
  }

  private trackViewNonBlocking(
    seekerId: string,
    listingId: string,
    listingData: HouseListingResponseDto,
    context: any
  ): void {
    setTimeout(() => {
      try {
        this.trackingService.trackView(
          seekerId,
          listingId,
          {
            ...listingData,
            propertyType: listingData.propertyType as 'APARTMENT' | 'HOUSE' | 'CONDO' | 'TOWNHOUSE' | 'VILLA' | 'STUDIO' | undefined,
            images: listingData.images || [],
            creatorId: listingData.creator?.id || '',
          },
          context
        );
      } catch (error) {
        this.logger.error(`Tracking failed: ${error.message}`);
      }
    }, 0);
  }

  private async executeGetHouseListingById(
    id: string
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      const listing = await this.prisma.houseListing.findUnique({
        where: { id },
        select: {
          id: true,
          externalId: true,
          creatorId: true,        
          creatorName: true,
          accountId: true,
          accountName: true,
          title: true,
          description: true,
          listingType: true,
          price: true,
          currency: true,
          bedrooms: true,
          bathrooms: true,
          amenities: true,
          isFurnished: true,
          locationCity: true,
          locationNeighborhood: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          latitude: true,
          longitude: true,
          categoryId: true,
          squareFootage: true,
          yearBuilt: true,
          propertyType: true,
          ownerEmail: true,
          images: true,
          category: true,
          minimumLeaseTerm: true,
          maximumLeaseTerm: true,
          depositAmount: true,
          isPetFriendly: true,
          utilitiesIncluded: true,
          utilitiesDetails: true,
          isNegotiable: true,
          titleDeedAvailable: true,
        },
      }) as unknown as HouseListingWithRelations | null;

      if (!listing) {
        return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');
      }

      return BaseResponseDto.ok(this.mapToDto(listing), 'Listing fetched successfully', 'OK');
    } catch (error) {
      this.logger.error(`getHouseListingById failed: ${error.message}`);
      return BaseResponseDto.fail('Fetch failed', 'ERROR');
    }
  }

   async getAdminListings(dto: GetAdminHousingFilterDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const {
      status,
      accountId,
      creatorId,
      listingType,
      propertyType,
      minBedrooms,
      minPrice,
      maxPrice,
      limit = 20,
      offset = 0,
    } = dto;

    try {
      const where: Prisma.HouseListingWhereInput = {};

      if (status) {
        where.status = status;
      }

      if (accountId) {
        where.accountId = accountId;
      }

      if (creatorId) {
        where.creatorId = creatorId;
      }

      if (listingType) {
        where.listingType = listingType;
      }

      if (propertyType) {
        where.propertyType = propertyType;
      }

      if (minBedrooms !== undefined) {
        where.bedrooms = { gte: minBedrooms };
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }

      this.logger.debug(`🔍 Admin query initiated. Filters: ${JSON.stringify(where)}`);

      const total = await this.prisma.houseListing.count({ where });

      const listings = (await this.prisma.houseListing.findMany({
        where,
        include: { 
          images: true, 
          category: true 
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })) as unknown as HouseListingWithRelations[];

      if (!listings || listings.length === 0) {
        const filterDesc = accountId ? `for account ${accountId}` : 'globally';
        this.logger.log(`ℹ️ Admin search returned zero results ${filterDesc}`);
        return BaseResponseDto.ok([], 'No listings match the provided filters', 'SUCCESS_EMPTY');
      }

      this.logger.log(`✅ Admin retrieved ${listings.length} listings`);

      const pagination: PaginationDto = {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };

      return BaseResponseDto.okWithPagination(
        listings.map((l) => this.mapToDto(l)),
        pagination,
        `Found ${listings.length} listings`,
        'OK'
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2023') {
          this.logger.warn(`⚠️ Admin provided invalid UUID format: ${accountId}`);
          return BaseResponseDto.fail('Invalid Account ID format provided', 'BAD_REQUEST');
        }
      }

      this.logger.error(`❌ Admin Fetch Failure: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      return BaseResponseDto.fail('System error occurred while fetching admin records', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // UPDATE METHODS (WITH CACHE INVALIDATION)
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
        select: { creatorId: true, accountId: true, categoryId: true }
      });

      if (!listing) return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');

      if (!isAdmin && listing.creatorId !== dto.callerId)
        return BaseResponseDto.fail('Unauthorized', 'UNAUTHORIZED');

      const { listingId, callerId, userRole, ...updateFields } = dto;

      const updated = await this.prisma.houseListing.update({
        where: { id: listingId },
        data: updateFields,
        include: { images: true, category: true },
      }) as unknown as HouseListingWithRelations;

      await this.invalidateCache({
        listingId: listingId,
        categoryId: listing.categoryId || undefined,
        allListings: true,
      });

      return BaseResponseDto.ok(this.mapToDto(updated));
    } catch (error) {
      return BaseResponseDto.fail('Update failed', 'ERROR');
    }
  }

  async updateListingStatus(dto: UpdateHouseListingStatusDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      const listing = await this.prisma.houseListing.findUnique({
        where: { id: dto.id },
        select: { accountId: true, categoryId: true }
      });

      if (!listing) return BaseResponseDto.fail('Listing not found', 'NOT_FOUND');

      if (listing.accountId !== dto.ownerId)
        return BaseResponseDto.fail('Unauthorized to change status', 'UNAUTHORIZED');

      const updated = await this.prisma.houseListing.update({
        where: { id: dto.id },
        data: { status: dto.status },
        include: { images: true, category: true },
      }) as unknown as HouseListingWithRelations;

      await this.invalidateCache({
        listingId: dto.id,
        categoryId: listing.categoryId || undefined,
        allListings: true,
      });

      return BaseResponseDto.ok(this.mapToDto(updated));
    } catch (error) {
      return BaseResponseDto.fail('Status update failed', 'ERROR');
    }
  }

  async archiveHouseListing(dto: ArchiveHouseListingsGrpcRequestDto): Promise<BaseResponseDto<null>> {
    try {
      const listing = await this.prisma.houseListing.findUnique({
        where: { id: dto.id },
        select: { accountId: true, categoryId: true }
      });

      const result = await this.prisma.houseListing.updateMany({
        where: {
          id: dto.id,
          accountId: dto.ownerId,
        },
        data: { status: 'ARCHIVED' },
      });

      if (result.count === 0) return BaseResponseDto.fail('Listing not found or unauthorized', 'NOT_FOUND');

      await this.invalidateCache({
        listingId: dto.id,
        categoryId: listing?.categoryId || undefined,
        allListings: true,
      });

      return BaseResponseDto.ok(null, 'Archived successfully');
    } catch (error) {
      return BaseResponseDto.fail('Archive failed', 'ERROR');
    }
  }

  // ======================================================
  // VIEWINGS (FULL IMPLEMENTATION WITH ORIGINAL LOGIC)
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
    
    const seekerId = dto.context?.seekerId;
    
    if (!seekerId) {
      this.logger.error('No house seeker ID found in context');
      return BaseResponseDto.fail('Authentication required. User ID is missing.', 'UNAUTHORIZED');
    }
    
    if (!dto.houseId) {
      this.logger.error('houseId is missing from request');
      return BaseResponseDto.fail('House ID is required.', 'BAD_REQUEST');
    }
    
    if (!dto.viewingDate) {
      this.logger.error('viewingDate is missing from request');
      return BaseResponseDto.fail('Viewing date is required.', 'BAD_REQUEST');
    }
    
    this.logger.log(`ScheduleViewing - HouseSeeker: ${seekerId}, House: ${dto.houseId}`);
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
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
            images: {
              where: { isMain: true },
              take: 1,
              select: { 
                url: true,
                isMain: true
              }
            }
          }
        });

        if (!house) {
          return BaseResponseDto.fail('House not found', 'NOT_FOUND');
        }

        if (house.creatorId === seekerId || house.accountId === seekerId) {
          this.logger.warn(`House seeker ${seekerId} attempted to schedule viewing for their own property ${dto.houseId}`);
          return BaseResponseDto.fail(
            'You cannot schedule a viewing for your own property',
            'FORBIDDEN'
          );
        }

        if (house.status !== 'AVAILABLE') {
          return BaseResponseDto.fail(
            `House is not available for viewing (current status: ${house.status})`,
            'CONFLICT'
          );
        }

        const viewingDate = new Date(dto.viewingDate);
        const now = new Date();
        
        if (viewingDate < now) {
          return BaseResponseDto.fail(
            'Viewing date must be in the future',
            'INVALID_DATE'
          );
        }

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

        this.logger.debug(`Creating viewing with: houseId=${dto.houseId}, viewerId=${seekerId}, bookedById=${seekerId}`);

        const result = await this.prisma.$transaction(async (tx) => {
          const viewing = await tx.houseViewing.create({
            data: {
              houseId: dto.houseId,
              viewerId: seekerId,
              viewingDate: viewingDate,
              status: 'SCHEDULED',
              notes: dto.notes || '',
              bookedById: seekerId,
            },
          });
          return viewing;
        }, {
          timeout: 10000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });

        setTimeout(() => {
          try {
            const formattedImages = house.images?.map(img => ({
              url: img.url,
              isMain: img.isMain
            }));

            this.trackingService.trackViewingScheduled(
              seekerId,
              house.id,
              result.id,
              viewingDate,
              {
                id: house.id,
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
                images: formattedImages,
                creatorId: house.creatorId
              },
              dto.context,
              false,
              undefined,
              seekerId
            );
          } catch (error) {
            this.logger.error(`Viewing tracking failed: ${error.message}`);
          }
        }, 0);

        await this.sendUserViewingNotifications(result, house, dto, seekerId); 
        
        this.logger.log(`Viewing scheduled successfully: ${result.id}`);
        
        return BaseResponseDto.ok(
          result as unknown as HouseViewingResponseDto,
          'Viewing scheduled successfully',
          'CREATED'
        );

      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            return BaseResponseDto.fail(
              'This time slot was just booked by someone else. Please choose another time.',
              'CONFLICT'
            );
          }
          if (error.code === 'P2003') {
            this.logger.error(`Foreign key constraint failed: ${error.message}`);
            return BaseResponseDto.fail('Invalid house ID or user ID', 'BAD_REQUEST');
          }
        }

        this.logger.error(`ScheduleViewing error (attempt ${attempt}): ${error.message}`);
        if (error.stack) {
          this.logger.debug(error.stack);
        }

        if (attempt < MAX_RETRIES && this.isTransientError(error)) {
          const backoffMs = 100 * Math.pow(2, attempt - 1);
          this.logger.warn(`Retry attempt ${attempt} after ${backoffMs}ms due to: ${(error as Error).message}`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        if (attempt === MAX_RETRIES) {
          this.logger.error(`ScheduleViewing failed after ${MAX_RETRIES} attempts: ${(error as Error).message}`);
          throw error;
        }
      }
    }
    
    return BaseResponseDto.fail('Viewing scheduling failed after retries', 'INTERNAL_ERROR');
  }

  /**
   * 🔐 ADMIN FLOW - Schedule viewing (with bypass capabilities)
   */
  async scheduleAdminViewing(dto: ScheduleAdminViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    try { 
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

      if (house.creatorId === dto.targetViewerId || house.accountId === dto.targetViewerId) {
        this.logger.warn(`👑 Admin ${dto.callerId} attempted to book viewing for property owner ${dto.targetViewerId} on their own property ${dto.houseId}`);
        return BaseResponseDto.fail(
          'Cannot schedule a viewing for the property owner on their own listing',
          'FORBIDDEN'
        );
      }

      if (house.status !== 'AVAILABLE') {
        this.logger.warn(`👑 Admin booking for non-AVAILABLE house: ${house.id} (status: ${house.status})`);
      }

      const viewingDate = new Date(dto.viewingDate);
      const now = new Date();
      
      if (viewingDate < now) {
        this.logger.warn(`👑 Admin booking for past date: ${viewingDate.toISOString()}`);
      }

      let viewerEmail = dto.targetViewerEmail;
      let viewerName = dto.targetViewerName;
      
      try {
        this.logger.log(`🔍 Validating viewer ID: ${dto.targetViewerId} with profile service`);
        
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

      const enrichedDto = {
        ...dto,
        targetViewerEmail: viewerEmail,
        targetViewerName: viewerName
      };

      await this.sendAdminViewingNotifications(result, house, enrichedDto, dto.adminMetadata);

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
  private async sendUserViewingNotifications(
    viewing: HouseViewing,
    house: HouseWithFullInfo & { images?: { url: string }[] },
    dto: ScheduleViewingGrpcRequestDto,
    attendingUserId: string
  ): Promise<void> {
    const attendingUserIdValue = attendingUserId;
    const attendingUserEmail = attendingUserId === dto.callerId ? dto.callerEmail : undefined;
    const attendingUserName = attendingUserId === dto.callerId ? dto.callerName : undefined;
    
    const bookingUserId = dto.callerId;
    const bookingUserEmail = dto.callerEmail;
    const bookingUserName = dto.callerName;
    
    const viewingDateStr = viewing.viewingDate.toLocaleString();
    const houseImageUrl = house.images?.[0]?.url;

    this.notificationBus.emit('viewing.scheduled', {
      viewingId: viewing.id,
      houseId: viewing.houseId,
      houseTitle: house.title,
      attendingUserId: attendingUserIdValue,
      attendingUserEmail: attendingUserEmail,
      attendingUserName: attendingUserName,
      bookedById: bookingUserId,
      bookedByEmail: bookingUserEmail,
      bookedByName: bookingUserName,
      viewingDate: viewing.viewingDate.toISOString(),
      location: house.locationCity,
      notes: viewing.notes || undefined,
      houseImageUrl: houseImageUrl,
      timestamp: new Date().toISOString(),
      isAdminBooking: false
    });

    const attendingUserEmailData: NotificationEmailData = {
      type: 'VIEWING_SCHEDULED',
      recipientId: attendingUserIdValue,
      recipientEmail: attendingUserEmail || bookingUserEmail,
      recipientName: attendingUserName || bookingUserName,
      template: 'viewing-scheduled-viewer',
      data: {
        houseTitle: house.title,
        houseImageUrl: houseImageUrl,
        viewingDate: viewingDateStr,
        location: house.locationCity,
        notes: viewing.notes || undefined,
        bookedBy: attendingUserId === bookingUserId ? 'You' : bookingUserName
      }
    };
    this.notificationBus.emit('notification.email', attendingUserEmailData);

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
          viewerName: attendingUserName || bookingUserName,
          viewerEmail: attendingUserEmail || bookingUserEmail,
          bookedById: bookingUserId,
          isAdminBooking: false
        }
      };
      this.notificationBus.emit('notification.email', ownerEmailData);
      this.logger.log(`📧 Owner notification sent to ${house.ownerEmail} for viewing ${viewing.id}`);
    }

    this.kafkaClient.emit('analytics.event', {
      eventType: 'viewing_scheduled',
      viewingId: viewing.id,
      houseId: viewing.houseId,
      attendingUserId: attendingUserIdValue,
      attendingUserEmail: attendingUserEmail || bookingUserEmail,
      bookedById: bookingUserId,
      bookedByEmail: bookingUserEmail,
      userRole: dto.userRole,
      isAdminBooking: false,
      timestamp: new Date().toISOString()
    });
  }

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
    const houseImageUrl = house.images?.[0]?.url;

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

    if (viewerEmail) {
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
      }
    }

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

  // ======================================================
  // PRIVATE HELPERS
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
      minimumLeaseTerm: listing.minimumLeaseTerm ?? undefined,
      maximumLeaseTerm: listing.maximumLeaseTerm ?? undefined,
      depositAmount: listing.depositAmount ?? undefined,
      isPetFriendly: listing.isPetFriendly ?? false,
      utilitiesIncluded: listing.utilitiesIncluded ?? false,
      utilitiesDetails: listing.utilitiesDetails ?? undefined,
      isNegotiable: listing.isNegotiable ?? true,
      titleDeedAvailable: listing.titleDeedAvailable ?? false,
      squareFootage: listing.squareFootage ?? undefined,
      yearBuilt: listing.yearBuilt ?? undefined,
      propertyType: listing.propertyType ?? undefined,
    };
  }

  private isTransientError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }
    
    const transientErrorCodes = [
      'P1001',
      'P1002',
      'P1008',
      'P1017'
    ];
    
    return transientErrorCodes.includes(error.code);
  }

  private async trackListingMilestone(
    accountId: string,
    accountName: string,
    creatorId: string,
    listingId: string,
    dto: CreateHouseListingGrpcRequestDto
  ): Promise<void> {
    try {
      const listingCount = await this.prisma.houseListing.count({
        where: { accountId }
      });

      this.logger.debug(`📊 Account ${accountId} now has ${listingCount} listings`);

      const significantMilestones = [1, 2, 3, 5, 10, 25, 50, 100];
      
      if (significantMilestones.includes(listingCount)) {
        const allListings = await this.prisma.houseListing.findMany({
          where: { accountId },
          select: { price: true }
        });
        
        const totalValue = allListings.reduce((sum, listing) => sum + listing.price, 0);
        const averagePrice = totalValue / listingCount;

        const milestoneData = {
          accountId,
          accountName,
          creatorId,
          creatorName: dto.creatorName,
          listingId,
          listingTitle: dto.title,
          listingPrice: dto.price,
          listingType: dto.listingType,
          locationCity: dto.locationCity,
          categoryId: dto.categoryId,
          milestone: listingCount,
          totalValue,
          averagePrice
        };

        setTimeout(() => {
          this.trackingService.trackListingMilestone(milestoneData).catch(error => {
            this.logger.error(`Failed to track milestone: ${error.message}`);
          });
        }, 0);

        this.logger.log(`🎯 Milestone ${listingCount} tracked for account ${accountId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to track listing milestone: ${error.message}`);
    }
  }


/**
 * Get all house listings with caching (Public)
 */
async getAllHouseListings(
    dto: GetAllHouseListingsRequestDto
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {

    this.logger.debug(`📥 Received DTO: ${JSON.stringify(dto)}`);
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
  
  
    const {
      limit = 20,
      offset = 0,
      city,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      propertyType,
      sortBy = 'recent',
      cacheTTL = this.DEFAULT_CACHE_TTL,
      isFurnished
    } = dto;


    const data = {
      limit,
      offset,
      city,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      propertyType,
      isFurnished,
      sortBy,
    };

    this.logger.log(
      `📊 getAllHouseListings: limit=${data.limit}, offset=${data.offset}, sortBy=${data.sortBy}, ` +
      `bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetAllHouseListings(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getHouseAllKey({
      city: data.city,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      listingType: data.listingType,
      bedrooms: data.bedrooms,
      propertyType: data.propertyType,
      isFurnished: data.isFurnished,
      sortBy: data.sortBy,
      page: page,
      limit: data.limit,
    });

    try {
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: HouseListingResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} listings`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetAllHouseListings(data);

      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-housing-queue',
          'cache-housing-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getAllHouseListings: ${error.message}`);
      return this.executeGetAllHouseListings(data);
    }
  }


/**
   * Private method that actually executes the query for getAllHouseListings
   */
  private async executeGetAllHouseListings(data: {
    limit: number;
    offset: number;
    city?: string;
    listingType?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string;
    isFurnished?: boolean;
    sortBy: 'recent' | 'price_asc' | 'price_desc';
  }): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    try {
      const where: Prisma.HouseListingWhereInput = {
        status: 'AVAILABLE',
      };

      if (data.city) {
        where.locationCity = data.city;
      }

      if (data.listingType) {
        where.listingType = data.listingType;
      }

      if (data.minPrice !== undefined || data.maxPrice !== undefined) {
        where.price = {};
        if (data.minPrice !== undefined) where.price.gte = data.minPrice;
        if (data.maxPrice !== undefined) where.price.lte = data.maxPrice;
      }

      if (data.bedrooms !== undefined) {
        where.bedrooms = { gte: data.bedrooms };
      }

      if (data.propertyType) {
        where.propertyType = data.propertyType;
      }

      if (data.isFurnished !== undefined && data.isFurnished !== null) {
        where.isFurnished = data.isFurnished;
      }

      let orderBy: any = {};
      switch (data.sortBy) {
        case 'price_asc':
          orderBy = { price: 'asc' };
          break;
        case 'price_desc':
          orderBy = { price: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.houseListing.count({ where });

      const listings = await this.prisma.houseListing.findMany({
        where,
        include: { 
          images: true, 
          category: true,
          subCategory: true
        },
        orderBy,
        take: data.limit,
        skip: data.offset,
      }) as unknown as HouseListingWithRelations[];

      const pagination: PaginationDto = {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      };

      return BaseResponseDto.okWithPagination(
        listings.map((l) => this.mapToDto(l)),
        pagination,
        `Found ${listings.length} listings`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get all house listings: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }

}