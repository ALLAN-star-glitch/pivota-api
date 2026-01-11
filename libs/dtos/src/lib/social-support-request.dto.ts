import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Valid Enums based on your Concept Note and Models
// PROVIDER_TYPES removed here as it is managed by the Account/Profile Service
const SUPPORT_TYPES = ['GRANT', 'TRAINING', 'FOOD_STAMP', 'MEDICAL_COVER', 'VOUCHER', 'GENERAL'];
const BENEFIT_STATUSES = ['PENDING', 'DELIVERED', 'RECEIVED', 'FAILED'];

/* ======================================================
   CREATE SUPPORT PROGRAM
====================================================== */
export class CreateSupportProgramDto {
  @ApiProperty({ example: 'Maternal Health Nutrition Support' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Providing monthly food baskets to expectant mothers.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Category ID in the HELP-AND-SUPPORT vertical' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  // REMOVED: providerType - This is now derived from the Account in Profile Service

  @ApiProperty({ 
    description: 'Type of support offered',
    enum: SUPPORT_TYPES,
    example: 'FOOD_STAMP' 
  })
  @IsString()
  @IsIn(SUPPORT_TYPES)
  supportType!: string;

  @ApiPropertyOptional({ example: 'Must be a resident of Nairobi and pregnant.' })
  @IsOptional()
  @IsString()
  eligibilityCriteria?: string;

  @ApiPropertyOptional({ example: ['Women', 'Low Income'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAudience?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresIdVerification?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresIncomeProof?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBudget?: number;

  @ApiPropertyOptional({ description: 'Max number of beneficiaries' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBeneficiaries?: number;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  @IsNotEmpty()
  locationCity!: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseCost?: number;

  @ApiPropertyOptional({ example: 'Kibera' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ description: 'Program expiry date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateSupportProgramGrpcRequestDto extends CreateSupportProgramDto {
  @ApiProperty({ description: 'The Root Account ID (Individual or Organization)' })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ description: 'Denormalized name from the Account profile' })
  @IsString()
  @IsNotEmpty()
  accountName!: string;

  @ApiProperty({ description: 'The UUID of the specific human staff member' })
  @IsUUID()
  @IsNotEmpty()
  creatorId!: string;

  @ApiPropertyOptional({ description: 'Denormalized name of the human staff member' })
  @IsString()
  @IsOptional()
  creatorName?: string;
}

/* ======================================================
   APPLY FOR SUPPORT
====================================================== */
export class ApplyForSupportDto {
  @ApiProperty({ example: 'I am a single mother of two and currently unemployed.' })
  @IsString()
  @IsNotEmpty()
  statementOfNeed!: string;

  @ApiPropertyOptional({ description: 'Specific value requested' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  requestedValue?: number;

  @ApiPropertyOptional({ description: 'Specific quantity requested' })
  @IsOptional()
  @IsInt()
  @Min(1)
  requestedQuantity?: number;

  @ApiProperty({ example: 'program-uuid-1234' })
  @IsString()
  @IsNotEmpty()
  programId!: string; 

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  termsAccepted!: boolean;
}

export class ApplyForSupportGrpcRequestDto extends ApplyForSupportDto {
  @IsUUID()
  @IsNotEmpty()
  beneficiaryId!: string;
}

/* ======================================================
   ISSUE BENEFIT
====================================================== */
export class IssueBenefitDto {
  @ApiProperty({ example: 'VOUCHER', enum: SUPPORT_TYPES })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 'REF-XYZ-001' })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({ example: 'Food Voucher for February' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class IssueBenefitGrpcRequestDto extends IssueBenefitDto {
  @IsString()
  @IsNotEmpty()
  applicationId!: string;
}

/* ======================================================
   SEARCH SUPPORT PROGRAMS
====================================================== */
export class SearchSupportProgramsDto {
  @ApiPropertyOptional({ example: 'Nairobi' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Women' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ enum: SUPPORT_TYPES })
  @IsOptional()
  @IsIn(SUPPORT_TYPES)
  supportType?: string;

  // REMOVED: providerType - Filtering by Org/Individual is handled by joining with Profile Account data

  @ApiPropertyOptional({ description: 'Filter by a specific provider account' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number;
}

/* ======================================================
   UPDATE BENEFIT STATUS
====================================================== */
export class UpdateBenefitStatusDto {
  @ApiProperty({ enum: BENEFIT_STATUSES, example: 'RECEIVED' })
  @IsString()
  @IsIn(BENEFIT_STATUSES)
  status!: string;

  @ApiPropertyOptional({ example: 'Confirmed receipt' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBenefitStatusGrpcRequestDto extends UpdateBenefitStatusDto {
  @IsString()
  @IsNotEmpty()
  benefitId!: string;

  @IsUUID()
  @IsNotEmpty()
  updaterId!: string;
}