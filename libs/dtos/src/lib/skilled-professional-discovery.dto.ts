// dtos/src/profile/skilled-professional-discovery.dto.ts

import { IsOptional, IsString, IsIn, IsNumber, Min, Max, IsBoolean } from "class-validator";

export class DiscoverSkilledProfessionalsDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(['HOUSING', 'JOBS', 'SOCIAL_SUPPORT'])
  vertical?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsIn(['rating', 'price_asc', 'price_desc', 'experience', 'recent'])
  sortBy?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class SkilledProfessionalDiscoveryResponseDto {
  professionals!: SkilledProfessionalPublicProfileDto[];
  pagination!: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

// In dtos/src/profile/skilled-professional.dto.ts

export class SkilledProfessionalPublicProfileDto {
  id!: string;
  uuid!: string;
  accountUuid!: string;
  accountType?: string;  // 'INDIVIDUAL' or 'ORGANIZATION'
  displayName?: string;   // Individual name or organization name
  title?: string;
  primaryCategory?: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
  };
  additionalCategories?: Array<{
    id: string;
    name: string;
    slug: string;
    vertical: string;
  }>;
  specialties!: string[];
  serviceAreas!: string[];
  yearsExperience?: number;
  hourlyRate?: number;
  dailyRate?: number;
  isVerified!: boolean;
  averageRating!: number;
  totalReviews!: number;
  completedJobs!: number;
  profileImage?: string;
  portfolioImages!: string[];
}