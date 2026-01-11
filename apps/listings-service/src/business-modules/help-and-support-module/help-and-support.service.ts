import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BaseResponseDto,
  SupportProgramResponseDto,
  SupportApplicationResponseDto,
  SupportBenefitResponseDto,
  SearchSupportProgramsDto,
  CreateSupportProgramGrpcRequestDto,
  ApplyForSupportGrpcRequestDto,
  IssueBenefitGrpcRequestDto,
} from '@pivota-api/dtos';
import { Prisma} from '../../../generated/prisma/client';

@Injectable()
export class HelpAndSupportService {
  private readonly logger = new Logger(HelpAndSupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ======================================================
  // CREATE SUPPORT PROGRAM
  // ======================================================
  async createProgram(
    dto: CreateSupportProgramGrpcRequestDto,
  ): Promise<BaseResponseDto<SupportProgramResponseDto>> {
    try {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, vertical: 'HELP-AND-SUPPORT' },
      });

      if (!category) {
        return {
          success: false,
          message: 'Invalid category for help and support',
          code: 'INVALID_CATEGORY',
          data: null,
        };
      }

      const program = await this.prisma.supportProgram.create({
        data: {
          accountId: dto.accountId,
          creatorId: dto.creatorId,
          creatorName: dto.creatorName,
          accountName: dto.accountName,
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          supportType: dto.supportType,
          eligibilityCriteria: dto.eligibilityCriteria,
          targetAudience: dto.targetAudience ?? [],
          requiresIdVerification: dto.requiresIdVerification ?? false,
          requiresIncomeProof: dto.requiresIncomeProof ?? false,
          isFree: dto.isFree ?? true,
          baseCost: dto.baseCost ?? 0,
          totalBudget: dto.totalBudget,
          remainingBudget: dto.totalBudget,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood,
          maxBeneficiaries: dto.maxBeneficiaries,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          status: 'ACTIVE',
        },
        include: { category: true },
      });

      return {
        success: true,
        message: 'Support program created successfully',
        code: 'CREATED',
        data: program as unknown as SupportProgramResponseDto,
      };
    } catch (error) {
      this.logger.error(`CreateProgram Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return {
        success: false,
        message: 'Failed to create support program',
        code: 'ERROR',
        data: null,
      };
    }
  }

  // ======================================================
  // APPLY FOR SUPPORT
  // ======================================================
  async applyForSupport(
    dto: ApplyForSupportGrpcRequestDto
  ): Promise<BaseResponseDto<SupportApplicationResponseDto>> {
    try {
      const program = await this.prisma.supportProgram.findUnique({
        where: { id: dto.programId },
      });

      if (!program || program.status !== 'ACTIVE') {
        return { success: false, message: 'Program not available', code: 'NOT_AVAILABLE', data: null };
      }

      if (program.maxBeneficiaries && program.currentBeneficiaries >= program.maxBeneficiaries) {
        return { success: false, message: 'Capacity reached', code: 'FULL', data: null };
      }

      const application = await this.prisma.supportApplication.create({
        data: {
          programId: dto.programId,
          beneficiaryId: dto.beneficiaryId,
          statementOfNeed: dto.statementOfNeed,
          termsAccepted: dto.termsAccepted,
          status: 'PENDING',
        },
      });

      return {
        success: true,
        message: 'Application submitted',
        code: 'APPLIED',
        data: application as unknown as SupportApplicationResponseDto,
      };
    } catch (error) {
      this.logger.error(`Apply Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { success: false, message: 'Application failed', code: 'ERROR', data: null };
    }
  }

  // ======================================================
  // ISSUE BENEFIT (The Handshake Init)
  // ======================================================
  async issueBenefit(
    dto: IssueBenefitGrpcRequestDto 
  ): Promise<BaseResponseDto<SupportBenefitResponseDto>> {
    return await this.prisma.$transaction(async (tx) => {
      const application = await tx.supportApplication.findUnique({
        where: { id: dto.applicationId },
        include: { program: true },
      });

      if (!application || application.status !== 'APPROVED') {
        throw new Error('Application must be approved first.');
      }

      // Create Benefit
      const benefit = await tx.supportBenefit.create({
        data: {
          applicationId: dto.applicationId,
          type: dto.type,
          value: dto.value,
          quantity: dto.quantity ?? 1,
          externalReference: dto.externalReference,
          description: dto.description,
          status: 'DELIVERED',
          disbursedAt: new Date(),
        },
      });

      // Update Program Budget if value exists
      if (dto.value && application.program.remainingBudget !== null) {
        await tx.supportProgram.update({
          where: { id: application.programId },
          data: {
            remainingBudget: { decrement: dto.value },
          },
        });
      }

      return {
        success: true,
        message: 'Benefit issued and budget updated',
        code: 'DISBURSED',
        data: benefit as unknown as SupportBenefitResponseDto,
      };
    });
  }

  // ======================================================
  // CONFIRM RECEIPT (The Handshake Confirmation)
  // ======================================================
  async confirmBenefit(
    benefitId: string, 
    beneficiaryId: string
  ): Promise<BaseResponseDto<SupportBenefitResponseDto>> {
    try {
      const benefit = await this.prisma.supportBenefit.findFirst({
        where: { id: benefitId, application: { beneficiaryId } },
      });

      if (!benefit) {
        return { success: false, message: 'Record not found', code: 'NOT_FOUND', data: null };
      }

      const updated = await this.prisma.supportBenefit.update({
        where: { id: benefitId },
        data: {
          confirmedByUser: true,
          status: 'RECEIVED',
          confirmedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Handshake complete: Receipt confirmed',
        code: 'CONFIRMED',
        data: updated as unknown as SupportBenefitResponseDto,
      };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return { success: false, message: 'Confirmation failed', code: 'ERROR', data: null };
    }
  }

  // ======================================================
  // SEARCH PROGRAMS
  // ======================================================
  async searchPrograms(dto: SearchSupportProgramsDto): Promise<BaseResponseDto<SupportProgramResponseDto[]>> {
    const where: Prisma.SupportProgramWhereInput = { status: 'ACTIVE' };
    if (dto.city) where.locationCity = dto.city;
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if (dto.targetAudience) where.targetAudience = { has: dto.targetAudience };

    const programs = await this.prisma.supportProgram.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 20,
      skip: dto.offset ?? 0,
    });

    return {
      success: true,
      message: 'Programs fetched',
      code: 'FETCHED',
      data: programs as unknown as SupportProgramResponseDto[],
    };
  }
}