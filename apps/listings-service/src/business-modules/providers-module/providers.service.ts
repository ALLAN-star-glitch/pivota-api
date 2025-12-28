import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { 
  BaseResponseDto, 
  CreateServiceOfferingDto, 
  ServiceOfferingResponseDto, 
  GetOfferingByVerticalRequestDto,
  DayAvailabilityDto // Added this import
} from '@pivota-api/dtos';

// Updated interface to include availability from Prisma
interface ServiceOfferingWithReviews {
  id: string;
  externalId: string;
  providerId: string;
  title: string;
  description: string;
  verticals: string[];
  categoryLabel: string | null;
  basePrice: number;
  priceUnit: string;
  locationCity: string;
  locationNeighborhood: string | null;
  yearsExperience: number | null;   
  availability: string | null; // Prisma returns this as a string
  additionalNotes: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviews: { rating: number }[];
}

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_GRPC') private readonly userService: ClientGrpc,
  ) {}

  /**
   * Safe parsing of availability JSON
   */
  private parseAvailability(availabilityStr: string | null): DayAvailabilityDto[] | undefined {
    if (!availabilityStr) return undefined;
    try {
      return JSON.parse(availabilityStr) as DayAvailabilityDto[];
    } catch (e) {
      this.logger.error(`Failed to parse availability JSON: ${e.message}`);
      return undefined;
    }
  }

  private mapToResponseDto(item: ServiceOfferingWithReviews): ServiceOfferingResponseDto {
    const reviews = item.reviews || [];
    const totalRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    const average = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      id: item.id,
      externalId: item.externalId,
      providerId: item.providerId,
      title: item.title,
      description: item.description,
      verticals: item.verticals,
      categoryLabel: item.categoryLabel ?? 'General',
      basePrice: item.basePrice,
      priceUnit: item.priceUnit,
      locationCity: item.locationCity,
      locationNeighborhood: item.locationNeighborhood ?? undefined,
      yearsExperience: item.yearsExperience ?? undefined,
      // Map the parsed JSON back to the DTO array
      availability: this.parseAvailability(item.availability),
      isVerified: item.isVerified,
      additionalNotes: item.additionalNotes ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      averageRating: Number(average.toFixed(1)),
      reviewCount: reviews.length,
    };
  }

  async createServiceOffering(
    dto: CreateServiceOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const created = await this.prisma.serviceOffering.create({
        data: {
          providerId: dto.providerId,
          title: dto.title,
          description: dto.description,
          categoryLabel: dto.categoryLabel, 
          verticals: dto.verticals ?? ["JOBS"], 
          basePrice: dto.basePrice,
          yearsExperience: dto.yearsExperience ?? null,
          priceUnit: dto.priceUnit ?? 'FIXED',
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood,
          // Stringify the array for Prisma storage
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
          additionalNotes: dto.additionalNotes,
          isVerified: false, 
        },
        include: {
          reviews: { select: { rating: true } },
        },
      });

      return {
        success: true,
        message: 'Service offering created successfully',
        code: 'OFFERING_CREATED',
        data: this.mapToResponseDto(created as unknown as ServiceOfferingWithReviews), 
      };
      
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create offering: ${err.message}`);
      return {
        success: false,
        message: 'Creation failed',
        code: 'INTERNAL_ERROR',
        error: { message: err.message, details: err.stack || null },
      };
    }
  }

  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const offerings = await this.prisma.serviceOffering.findMany({
        where: {
          verticals: { has: dto.vertical }, 
          ...(dto.city && { locationCity: dto.city }), 
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: { 
          reviews: { select: { rating: true } } 
        },
      });

      return {
        success: true,
        message: `Found ${offerings.length} ${dto.vertical} providers`,
        code: 'FETCH_SUCCESS',
        data: offerings.map(item => this.mapToResponseDto(item as unknown as ServiceOfferingWithReviews)),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for vertical ${dto.vertical}: ${err.message}`);
      return { 
        success: false, 
        message: 'Fetch failed', 
        code: 'FETCH_ERROR', 
        error: { message: err.message, details: null } 
      };
    }
  }
}