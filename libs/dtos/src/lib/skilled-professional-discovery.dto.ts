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

  @IsOptional()
  @IsBoolean()
  includeContactInfo?: boolean = false;  // Default to false for privacy
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

// dtos/src/profile/skilled-professional.dto.ts

export class SkilledProfessionalPublicProfileDto {
  id!: string;
  uuid!: string;
  accountUuid!: string;
  accountType?: string;  // 'INDIVIDUAL' or 'ORGANIZATION'
  displayName?: string;   // Individual name or organization name
  title?: string;
  
  // ========== CONTACT INFORMATION (CRITICAL FOR BOOKINGS) ==========
  email!: string;           // Primary contact email (required for communication)
  phone!: string;           // Phone number for M-PESA and SMS notifications
  alternativePhone?: string; // Optional secondary contact number
  website?: string;         // Professional website or portfolio
  
  // ========== LOCATION DETAILS ==========
  address?: string;         // Physical address
  city?: string;            // City of operation
  neighborhood?: string;    // Specific neighborhood
  locationCoordinates?: {    // For service area mapping
    latitude: number;
    longitude: number;
  };
  
  // ========== PROFESSIONAL DETAILS ==========
  primaryCategory?: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
    yearsExperience?: number;
  };
  additionalCategories?: Array<{
    id: string;
    name: string;
    slug: string;
    vertical: string;
  }>;
  specialties!: string[];
  serviceAreas!: string[];  // Already exists - neighborhoods/zones they serve
  serviceRadius?: number;    // Maximum distance willing to travel (in km)
  yearsExperience?: number;
  
  // ========== PRICING ==========
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  currency?: string;         // Default: 'KES'
  
  // ========== VERIFICATION & TRUST ==========
  isVerified!: boolean;
  verificationBadges?: string[]; // ['ID_VERIFIED', 'LICENSE_VERIFIED', 'BACKGROUND_CHECKED']
  averageRating!: number;
  totalReviews!: number;
  completedJobs!: number;
  responseRate?: number;      // Percentage of booking requests responded to
  responseTime?: string;      // Average response time (e.g., "within 2 hours")
  
  // ========== MEDIA & DOCUMENTS ==========
  profileImage?: string;      // Already exists
  portfolioImages!: string[];
  coverImage?: string;        // Banner image for profile
  identificationDocument?: {   // For verification
    type: string;              // 'NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE'
    number?: string;           // Partially masked for privacy
    isVerified: boolean;
  };
  
  // ========== AVAILABILITY ==========
  availabilitySchedule?: {     // Structured availability
    monday?: string[];         // e.g., ['09:00-12:00', '14:00-17:00']
    tuesday?: string[];
    wednesday?: string[];
    thursday?: string[];
    friday?: string[];
    saturday?: string[];
    sunday?: string[];
  };
  isAvailableNow?: boolean;    // For real-time booking
  nextAvailableSlot?: Date;    // Next available time slot
  
  // ========== BUSINESS DETAILS ==========
  businessRegistrationNumber?: string;  // For formal professionals
  taxIdentificationNumber?: string;      // For invoicing
  insuranceProvider?: string;            // Liability insurance
  insuranceExpiry?: Date;                // When insurance expires
  licenseNumber?: string;                // Professional license
  licenseExpiry?: Date;                  // License expiration date
  licenseIssuingBody?: string;           // e.g., 'Engineers Board of Kenya'
  
  // ========== SOCIAL & COMMUNICATION ==========
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    whatsapp?: string;        // For WhatsApp business
  };
  preferredContactMethod?: 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'PLATFORM';
  languagesSpoken!: string[];  // ['English', 'Swahili', 'Luo', etc.]
  
  // ========== ADDITIONAL METADATA ==========
  bio?: string;                // Short professional biography
  joinedDate?: Date;           // When they joined the platform
  lastActiveAt?: Date;         // Last activity timestamp
  totalEarnings?: number;      // Lifetime earnings (for analytics)
  bookingAcceptanceRate?: number; // Percentage of accepted bookings
  
  // ========== EMERGENCY CONTACT ==========
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}