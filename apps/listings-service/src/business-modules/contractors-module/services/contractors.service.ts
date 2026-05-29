/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use strict";

import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';

import { 
  BaseResponseDto, 
  ServiceOfferingResponseDto, 
  GetOfferingByVerticalRequestDto,
  DayAvailabilityDto, 
  CreateServiceGrpcOfferingDto,
  PaginationDto,
  SkilledProfessionalProfileResponseDto,
  SkilledProfessionalPublicProfileDto,
} from '@pivota-api/dtos';
import { ContractorsPricingService } from './contractors-pricing.service';

// gRPC interface for Profile Service - USING EXACT DTO TYPES
interface ProfileServiceGrpc {
  getSkilledProfessionalByAccount(
    data: { accountUuid: string }
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  getSkilledProfessionalByUuid(
    data: { uuid: string }
  ): Observable<BaseResponseDto<SkilledProfessionalPublicProfileDto>>;
}

/**
 * Internal interface matching the optimized ServiceOffering Prisma Model
 */
interface ServiceOfferingWithDetails {
  id: string;
  externalId: string;
  creatorId: string;
  accountId: string;
  skilledProfessionalId: string;
  professionalName: string | null;
  professionalAvatar: string | null;
  isVerified: boolean;
  yearsExperience: number | null;
  serviceAreas: any | null;
  hourlyRate: number | null;
  title: string;
  description: string;
  // REMOVED: verticals: string[];
  categoryId: string;
  basePrice: number;
  priceUnit: string;
  currency: string;
  locationCity: string;
  locationNeighborhood: string | null;
  availability: string | null;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; slug: string; vertical: string };
  reviews: { rating: number }[];
}

@Injectable()
export class ContractorsService {
  private readonly logger = new Logger(ContractorsService.name);
  private profileGrpc: ProfileServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: ContractorsPricingService,
    @Inject('PROFILE_GRPC') private readonly profileGrpcClient: ClientGrpc,
  ) {
    this.profileGrpc = this.profileGrpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  private parseAvailability(availabilityStr: string | null): DayAvailabilityDto[] | undefined {
    if (!availabilityStr) return undefined;
    try {
      return JSON.parse(availabilityStr) as DayAvailabilityDto[];
    } catch (e) {
      this.logger.error(`Failed to parse availability JSON string`);
      return undefined;
    }
  }

  private parseServiceAreas(serviceAreasJson: any | null): string[] | undefined {
    if (!serviceAreasJson) return undefined;
    try {
      if (typeof serviceAreasJson === 'string') {
        return JSON.parse(serviceAreasJson);
      }
      return serviceAreasJson as string[];
    } catch (e) {
      this.logger.error(`Failed to parse service areas JSON`);
      return undefined;
    }
  }

  /**
   * Fetch skilled professional details from Profile Service via gRPC
   */
  private async getSkilledProfessionalDetails(skilledProfessionalId: string): Promise<SkilledProfessionalPublicProfileDto | null> {
    try {
      const response = await firstValueFrom(
        this.profileGrpc.getSkilledProfessionalByUuid({ uuid: skilledProfessionalId })
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch professional details for ${skilledProfessionalId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate that the skilled professional profile exists and is active
   */
  private async validateSkilledProfessionalProfile(skilledProfessionalId: string): Promise<SkilledProfessionalPublicProfileDto> {
    const professional = await this.getSkilledProfessionalDetails(skilledProfessionalId);
    
    if (!professional) {
      throw new BadRequestException(
        'Skilled professional profile not found. Please create a professional profile first.'
      );
    }
    
    return professional;
  }

  /**
   * Validate category exists and is of type COMPLIMENTARY
   */
  private async validateCategory(categoryId: string): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      throw new BadRequestException(`Category with ID ${categoryId} not found`);
    }
    
    if (category.type !== 'COMPLIMENTARY') {
      throw new BadRequestException('Service offerings can only be posted under COMPLIMENTARY categories');
    }
    
    return category;
  }

  /**
   * Maps Prisma result to Response DTO
   */
  private mapToResponseDto(
    item: ServiceOfferingWithDetails,
    professionalDetails?: SkilledProfessionalPublicProfileDto | null
  ): ServiceOfferingResponseDto {
    const reviews = item.reviews || [];
    const totalRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    const average = reviews.length > 0 ? totalRating / reviews.length : 0;

    const professional = professionalDetails;
    const professionalName = professional?.displayName || professional?.title || item.professionalName;
    const professionalAvatar = professional?.profileImage || item.professionalAvatar;
    
    // Get vertical from category instead of item.verticals
    const vertical = item.category?.vertical || '';
    
    return {
      id: item.id,
      externalId: item.externalId,
      
      creator: {
        id: item.creatorId,
        fullName: professionalName || '',
      },
      
      account: {
        id: item.accountId,
        name: professionalName || 'Professional',
        isVerified: professional?.isVerified ?? item.isVerified,
      },
      
      contractorType: 'SKILLED_PROFESSIONAL',
      isVerified: professional?.isVerified ?? item.isVerified,
      professionalId: item.skilledProfessionalId,
      professionalName: professionalName || '',
      professionalAvatar: professionalAvatar,
      yearsExperience: professional?.yearsExperience ?? item.yearsExperience ?? undefined,
      serviceAreas: professional?.serviceAreas ?? this.parseServiceAreas(item.serviceAreas),
      hourlyRate: professional?.hourlyRate ?? item.hourlyRate ?? undefined,
      
      title: item.title,
      description: item.description,
      verticals: [vertical], // Convert single vertical to array for DTO compatibility
      categoryId: item.categoryId,
      categoryName: item.category?.name,
      
      basePrice: item.basePrice,
      priceUnit: item.priceUnit,
      currency: item.currency,
      
      locationCity: item.locationCity,
      locationNeighborhood: item.locationNeighborhood ?? undefined,
      
      availability: this.parseAvailability(item.availability),
      
      status: item.status,
      expiresAt: item.expiresAt,
      
      averageRating: Number(average.toFixed(1)),
      reviewCount: reviews.length,
      
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Persists a new service offering
   */
  async createServiceOffering(
    dto: CreateServiceGrpcOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      // 1. Validate that the skilled professional profile exists
      const professional = await this.validateSkilledProfessionalProfile(dto.skilledProfessionalId);
      
      // 2. Validate category and get its details
      const category = await this.validateCategory(dto.categoryId);
      
      // 3. Validate pricing rules - pricing service will fetch the category internally
      await this.pricingService.validateOfferingPricing(dto);

      // 4. Prepare denormalized data from professional profile
      const professionalName = professional.displayName || professional.title;
      const professionalAvatar = professional.profileImage;
      const serviceAreas = professional.serviceAreas;
      const hourlyRate = professional.hourlyRate;
      const yearsExperience = professional.yearsExperience;
      const isVerified = professional.isVerified || false;

      // 5. Create the offering (REMOVED verticals field)
      const created = await this.prisma.serviceOffering.create({
        data: {
          creatorId: dto.creatorId,
          accountId: dto.accountId,
          skilledProfessionalId: dto.skilledProfessionalId,
          professionalName,
          professionalAvatar,
          isVerified,
          yearsExperience,
          serviceAreas: serviceAreas ? JSON.stringify(serviceAreas) : null,
          hourlyRate,
          title: dto.title,
          description: dto.description,
          // REMOVED: verticals field
          categoryId: dto.categoryId,
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit || 'PER_HOUR',
          currency: dto.currency || 'KES',
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood,
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
          status: 'ACTIVE',
        },
        include: {
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } },
        },
      });

      const responseDto = this.mapToResponseDto(created as ServiceOfferingWithDetails, professional);

      return BaseResponseDto.ok(
        responseDto,
        'Service offering created successfully',
        'CREATED'
      );
      
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create offering: ${err.message}`);
      
      return BaseResponseDto.fail(
        err.message || 'Creation failed',
        error instanceof BadRequestException ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
      );
    }
  }

  /**
   * Get offerings by professional UUID
   */
  async getOfferingsByProfessional(
    professionalUuid: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const offerings = await this.prisma.serviceOffering.findMany({
        where: { 
          skilledProfessionalId: professionalUuid,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      const professional = offerings.length > 0 
        ? await this.getSkilledProfessionalDetails(professionalUuid)
        : null;

      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as ServiceOfferingWithDetails, professional)
      );

      return BaseResponseDto.ok(
        mappedOfferings,
        `Found ${mappedOfferings.length} service offerings`,
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for professional ${professionalUuid}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get offerings by account ID
   */
  async getOfferingsByAccount(
    accountId: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const offerings = await this.prisma.serviceOffering.findMany({
        where: { 
          accountId,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      const professional = offerings.length > 0 && offerings[0].skilledProfessionalId
        ? await this.getSkilledProfessionalDetails(offerings[0].skilledProfessionalId)
        : null;

      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as ServiceOfferingWithDetails, professional)
      );

      return BaseResponseDto.ok(
        mappedOfferings,
        `Found ${mappedOfferings.length} service offerings`,
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for account ${accountId}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get single offering by ID
   */
  async getOfferingById(
    offeringId: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const offering = await this.prisma.serviceOffering.findUnique({
        where: { id: offeringId },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      if (!offering) {
        return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
      }

      const professional = offering.skilledProfessionalId
        ? await this.getSkilledProfessionalDetails(offering.skilledProfessionalId)
        : null;

      const mappedOffering = this.mapToResponseDto(offering as ServiceOfferingWithDetails, professional);

      return BaseResponseDto.ok(
        mappedOffering,
        'Service offering retrieved',
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for offering ${offeringId}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Update a service offering
   */
  async updateServiceOffering(
    offeringId: string,
    dto: Partial<CreateServiceGrpcOfferingDto>,
    userId: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const existing = await this.prisma.serviceOffering.findUnique({
        where: { id: offeringId },
      });

      if (!existing) {
        return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
      }

      if (existing.creatorId !== userId) {
        return BaseResponseDto.fail('Unauthorized to update this offering', 'FORBIDDEN');
      }

      const updated = await this.prisma.serviceOffering.update({
        where: { id: offeringId },
        data: {
          title: dto.title,
          description: dto.description,
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood,
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
        },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      const professional = updated.skilledProfessionalId
        ? await this.getSkilledProfessionalDetails(updated.skilledProfessionalId)
        : null;

      return BaseResponseDto.ok(
        this.mapToResponseDto(updated as ServiceOfferingWithDetails, professional),
        'Service offering updated successfully',
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update offering: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Update failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Delete (soft delete) a service offering
   */
  async deleteServiceOffering(
    offeringId: string,
    userId: string
  ): Promise<BaseResponseDto<null>> {
    try {
      const existing = await this.prisma.serviceOffering.findUnique({
        where: { id: offeringId },
      });

      if (!existing) {
        return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
      }

      if (existing.creatorId !== userId) {
        return BaseResponseDto.fail('Unauthorized to delete this offering', 'FORBIDDEN');
      }

      await this.prisma.serviceOffering.update({
        where: { id: offeringId },
        data: { status: 'ARCHIVED' },
      });

      return BaseResponseDto.ok(null, 'Service offering archived successfully', 'OK');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete offering: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Delete failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Fetches offerings based on Vertical (PROFESSIONAL_SERVICES, JOBS, HOUSING, etc.)
   * Now uses category.vertical instead of the removed verticals field
   */
  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      // Build where clause using category.vertical instead of verticals array
      const where: any = {
        status: 'ACTIVE',
        category: {
          vertical: dto.vertical
        }
      };
      
      if (dto.city) where.locationCity = dto.city;
      if (dto.categoryId) where.categoryId = dto.categoryId;
      if (dto.minPrice !== undefined) where.basePrice = { gte: dto.minPrice };
      if (dto.maxPrice !== undefined) where.basePrice = { lte: dto.maxPrice };
      if (dto.isVerified !== undefined) where.isVerified = dto.isVerified;

      const offerings = await this.prisma.serviceOffering.findMany({
        where,
        orderBy: {
          ...(dto.sortBy === 'price_asc' && { basePrice: 'asc' }),
          ...(dto.sortBy === 'price_desc' && { basePrice: 'desc' }),
          ...(dto.sortBy === 'experience' && { yearsExperience: 'desc' }),
          ...((!dto.sortBy || dto.sortBy === 'rating') && { createdAt: 'desc' }),
        },
        skip: dto.offset || 0,
        take: dto.limit || 20,
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      // Fetch professional details for unique skilledProfessionalIds
      const professionalIds = [...new Set(offerings.map(o => o.skilledProfessionalId).filter(Boolean))];
      const professionalDetails = new Map<string, SkilledProfessionalPublicProfileDto>();
      
      await Promise.all(
        professionalIds.map(async (id) => {
          const details = await this.getSkilledProfessionalDetails(id);
          if (details) {
            professionalDetails.set(id, details);
          }
        })
      );

      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
      );

      const total = await this.prisma.serviceOffering.count({ where });

      const pagination: PaginationDto = {
        total,
        limit: dto.limit || 20,
        offset: dto.offset || 0,
        hasMore: (dto.offset || 0) + (dto.limit || 20) < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedOfferings,
        pagination,
        `Found ${mappedOfferings.length} ${dto.vertical} service offerings`,
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for vertical ${dto.vertical}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get offerings by category
   */
  async getOfferingsByCategory(
    data: { 
      categoryId: string; 
      limit?: number; 
      offset?: number;
      city?: string;
      minPrice?: number;
      maxPrice?: number;
    }
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      // Verify category exists and is COMPLIMENTARY
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId }
      });
      
      if (!category) {
        return BaseResponseDto.fail('Category not found', 'CATEGORY_NOT_FOUND');
      }
      
      if (category.type !== 'COMPLIMENTARY') {
        return BaseResponseDto.fail(
          'Service offerings can only be retrieved for COMPLIMENTARY categories', 
          'INVALID_CATEGORY_TYPE'
        );
      }
      
      // Build where clause
      const where: any = {
        categoryId: data.categoryId,
        status: 'ACTIVE',
      };
      
      if (data.city) {
        where.locationCity = data.city;
      }
      
      if (data.minPrice !== undefined || data.maxPrice !== undefined) {
        where.basePrice = {};
        if (data.minPrice !== undefined) where.basePrice.gte = data.minPrice;
        if (data.maxPrice !== undefined) where.basePrice.lte = data.maxPrice;
      }
      
      // Get total count for pagination
      const total = await this.prisma.serviceOffering.count({ where });
      
      // Get paginated offerings
      const offerings = await this.prisma.serviceOffering.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: data.offset || 0,
        take: data.limit || 20,
      });
      
      // Fetch professional details for each offering
      const professionalIds = [...new Set(offerings.map(o => o.skilledProfessionalId).filter(Boolean))];
      const professionalDetails = new Map();
      
      await Promise.all(
        professionalIds.map(async (id) => {
          const details = await this.getSkilledProfessionalDetails(id);
          if (details) {
            professionalDetails.set(id, details);
          }
        })
      );
      
      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
      );
      
      // Create pagination object
      const pagination: PaginationDto = {
        total,
        limit: data.limit || 20,
        offset: data.offset || 0,
        hasMore: (data.offset || 0) + (data.limit || 20) < total,
      };
      
      // Return with pagination
      return BaseResponseDto.okWithPagination(
        mappedOfferings,
        pagination,
        `Found ${mappedOfferings.length} offerings for category ${category.name}`,
        'OK'
      );
      
    } catch (error) {
      this.logger.error(`Failed to get offerings by category: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }
}