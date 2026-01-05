import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedCategoryResponseDto } from './housing.responses.dto';

/* ======================================================
   SUPPORT PROGRAM RESPONSE
====================================================== */
export class SupportProgramResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ example: 'ORGANIZATION' })
  providerType!: string;

  @ApiProperty()
  isProviderVerified!: boolean;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: () => NestedCategoryResponseDto })
  category!: NestedCategoryResponseDto;

  @ApiProperty({ example: 'GRANT' })
  supportType!: string;

  @ApiPropertyOptional()
  eligibilityCriteria?: string;

  @ApiProperty({ type: [String] })
  targetAudience!: string[];

  @ApiProperty()
  requiresIdVerification!: boolean;

  @ApiProperty()
  currentBeneficiaries!: number;

  @ApiPropertyOptional()
  maxBeneficiaries?: number;

  @ApiPropertyOptional({ description: 'Remaining funds for this program' })
  remainingBudget?: number;

  @ApiProperty()
  locationCity!: string;

  @ApiPropertyOptional()
  locationNeighborhood?: string;

  @ApiProperty()
  status!: string; 

  @ApiProperty()
  createdAt!: Date;
}

/* ======================================================
   SUPPORT APPLICATION RESPONSE
====================================================== */
export class SupportApplicationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  programId!: string;

  @ApiProperty()
  beneficiaryId!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiPropertyOptional()
  statementOfNeed?: string;

  @ApiPropertyOptional({ description: 'Private internal notes' })
  internalNGOAudit?: string;

  @ApiProperty()
  isComplianceVerified!: boolean;

  @ApiProperty()
  termsAccepted!: boolean;

  @ApiPropertyOptional()
  awardedAmount?: number;

  @ApiPropertyOptional()
  awardedQuantity?: number;

  @ApiProperty()
  createdAt!: Date;
}

/* ======================================================
   SUPPORT BENEFIT RESPONSE (The Handshake Record)
====================================================== */
export class SupportBenefitResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ example: 'CASH_TRANSFER' })
  type!: string;

  @ApiPropertyOptional()
  value?: number;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiProperty({ description: 'Proof of Delivery/Handshake confirmation' })
  confirmedByUser!: boolean;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional({ description: 'Audit link to external provider' })
  externalReference?: string;

  @ApiProperty({ example: 'DELIVERED' })
  status!: string;

  @ApiPropertyOptional()
  disbursedAt?: Date;

  @ApiProperty()
  createdAt!: Date;
}