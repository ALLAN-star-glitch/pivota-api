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
const PROVIDER_TYPES = ['INDIVIDUAL', 'ORGANIZATION', 'GOVERNMENT', 'RELIGIOUS_BODY'];
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

  @ApiProperty({ description: 'Category ID in the SOCIAL_SUPPORT vertical' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ 
    description: 'The type of provider listing this opportunity',
    enum: PROVIDER_TYPES,
    example: 'ORGANIZATION'
  })
  @IsString()
  @IsIn(PROVIDER_TYPES)
  providerType!: string;

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
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  @IsUUID()
  @IsNotEmpty()
  creatorId!: string;
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

  @ApiProperty({ example: 'program-uuid-1234', description: 'ID of the support program' })
  @IsString()
  @IsNotEmpty()
  programId!: string; 

  @ApiProperty({ example: true, description: 'User must accept terms' })
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
   ISSUE BENEFIT (The Handshake Init)
====================================================== */
export class IssueBenefitDto {
  @ApiProperty({ example: 'CASH_TRANSFER', enum: SUPPORT_TYPES })
  @IsString()
  @IsIn(SUPPORT_TYPES)
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

  @ApiPropertyOptional({ example: 'MPESA-REF-123', description: 'Audit link to external payment' })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({ example: 'January Stipend' })
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

  @ApiPropertyOptional({ enum: PROVIDER_TYPES })
  @IsOptional()
  @IsIn(PROVIDER_TYPES)
  providerType?: string;

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
   UPDATE BENEFIT STATUS (The Handshake Update)
====================================================== */
export class UpdateBenefitStatusDto {
  @ApiProperty({ 
    description: 'The new status of the benefit disbursement',
    enum: BENEFIT_STATUSES,
    example: 'RECEIVED'
  })
  @IsString()
  @IsIn(BENEFIT_STATUSES) // This consumes the BENEFIT_STATUSES constant
  status!: string;

  @ApiPropertyOptional({ 
    description: 'Optional note regarding the status change (e.g., why it failed)',
    example: 'Beneficiary confirmed receipt via phone.' 
  })
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
  updaterId!: string; // The ID of the person performing the update
}