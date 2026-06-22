import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
  CreateServiceGrpcOfferingDto,
  CreateServiceOfferingDto,
  UpdateServiceOfferingDto,
  GetAllOfferingsRequestDto,
  GetOfferingsByCategoryRequestDto,
  GetOfferingsByProfessionalRequestDto,
  GetOfferingsByAccountRequestDto,
  GetOfferingByIdRequestDto,
} from '@pivota-api/dtos';
import { UserService } from '../../UserProfileGatewayModule/services/user.service';

// This matches the contractors.proto (Service Offerings only)
interface ContractorsServiceGrpc {
  // Service Offering Methods
  CreateServiceOffering(
    data: CreateServiceGrpcOfferingDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  GetOfferingsByVertical(
    data: GetOfferingByVerticalRequestDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingsByAccount(
    data: GetOfferingsByAccountRequestDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingsByProfessional(
    data: GetOfferingsByProfessionalRequestDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingById(
    data: GetOfferingByIdRequestDto, 
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  UpdateServiceOffering(
    data: { id: string; userId: string } & UpdateServiceOfferingDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  DeleteServiceOffering(
    data: { id: string; userId: string },
  ): Observable<BaseResponseDto<null>>;

  GetOfferingsByCategory(
    data: GetOfferingsByCategoryRequestDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  // ===================================================
  // GET ALL OFFERINGS (Across all categories)
  // ===================================================
  GetAllOfferings(
    data: GetAllOfferingsRequestDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;
}

@Injectable()
export class ContractorsGatewayService {
  private readonly logger = new Logger(ContractorsGatewayService.name);
  private grpcService: ContractorsServiceGrpc;

  constructor(
    @Inject('CONTRACTORS_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
    private readonly userService: UserService,
  ) {
    this.grpcService = this.grpcClient.getService<ContractorsServiceGrpc>('ContractorsService');
  }

  // ===========================================================
  // SERVICE OFFERING METHODS
  // ===========================================================

  async createServiceOffering(
    dto: CreateServiceOfferingDto,
    userId: string,
    accountId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const professionalProfile = await this.userService.getSkilledProfessionalByAccount(accountId);
      
      if (!professionalProfile.success || !professionalProfile.data) {
        return BaseResponseDto.fail(
          'No skilled professional profile found. Please create a professional profile first.',
          'PROFILE_NOT_FOUND'
        );
      }

      const grpcRequest: CreateServiceGrpcOfferingDto = {
        ...dto,
        skilledProfessionalId: professionalProfile.data.uuid,
        creatorId: userId,
        accountId: accountId,
      };

      const res = await firstValueFrom(this.grpcService.CreateServiceOffering(grpcRequest));

      this.logger.debug(`CreateServiceOffering gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error creating offering: ${error.message}`);
      return BaseResponseDto.fail('Internal Service Error', 'GRPC_ERROR');
    }
  }

  // ===========================================================
  // PUBLIC LISTING METHODS (WITH EXPLICIT BOOLEAN CONVERSION)
  // ===========================================================

  /**
   * Get offerings by vertical with full cache control
   */
  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      // ✅ EXPLICIT BOOLEAN CONVERSION - Fixes the "false" → true issue
      const grpcRequest: GetOfferingByVerticalRequestDto = {
        ...dto,
        bypassCache: dto.bypassCache === true,
        skipCache: dto.skipCache === true,
        refreshCache: dto.refreshCache === true,
        readOnly: dto.readOnly === true,
        isVerified: dto.isVerified === true,
      };

      this.logger.debug(
        `📤 Sending to gRPC - GetOfferingsByVertical: vertical=${grpcRequest.vertical}, ` +
        `bypassCache=${grpcRequest.bypassCache}, skipCache=${grpcRequest.skipCache}, refreshCache=${grpcRequest.refreshCache}`
      );

      const res = await firstValueFrom(this.grpcService.GetOfferingsByVertical(grpcRequest));

      this.logger.debug(
        `GetOfferingsByVertical gRPC Response: vertical=${dto.vertical}, ` +
        `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by vertical: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch providers', 'FETCH_ERROR');
    }
  }

  /**
   * Get offerings by category with full cache control
   */
  async getOfferingsByCategory(
    dto: GetOfferingsByCategoryRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      // ✅ EXPLICIT BOOLEAN CONVERSION
      const grpcRequest: GetOfferingsByCategoryRequestDto = {
        ...dto,
        bypassCache: dto.bypassCache === true,
        skipCache: dto.skipCache === true,
        refreshCache: dto.refreshCache === true,
        readOnly: dto.readOnly === true,
      };

      this.logger.debug(
        `📤 Sending to gRPC - GetOfferingsByCategory: categoryId=${grpcRequest.categoryId}, ` +
        `bypassCache=${grpcRequest.bypassCache}, skipCache=${grpcRequest.skipCache}, refreshCache=${grpcRequest.refreshCache}`
      );

      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByCategory(grpcRequest)
      );

      this.logger.debug(
        `GetOfferingsByCategory gRPC Response: categoryId=${dto.categoryId}, ` +
        `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by category: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  /**
   * Get all offerings across all categories with full cache control
   */
  async getAllOfferings(
    dto: GetAllOfferingsRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      // ✅ EXPLICIT BOOLEAN CONVERSION - THIS IS THE FIX!
      const grpcRequest: GetAllOfferingsRequestDto = {
        limit: dto.limit,
        offset: dto.offset,
        city: dto.city,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        sortBy: dto.sortBy,
        minRating: dto.minRating,
        // ✅ Convert booleans explicitly
        verifiedOnly: dto.verifiedOnly === true,
        bypassCache: dto.bypassCache === true,
        skipCache: dto.skipCache === true,
        refreshCache: dto.refreshCache === true,
        cacheTTL: dto.cacheTTL,
        readOnly: dto.readOnly === true,
      };

      this.logger.debug(
        `📤 Sending to gRPC - GetAllOfferings: limit=${grpcRequest.limit}, offset=${grpcRequest.offset}, ` +
        `bypassCache=${grpcRequest.bypassCache}, skipCache=${grpcRequest.skipCache}, refreshCache=${grpcRequest.refreshCache}, ` +
        `readOnly=${grpcRequest.readOnly}, verifiedOnly=${grpcRequest.verifiedOnly}`
      );

      const res = await firstValueFrom(
        this.grpcService.GetAllOfferings(grpcRequest)
      );

      this.logger.debug(
        `GetAllOfferings gRPC Response: limit=${dto.limit}, offset=${dto.offset}, sortBy=${dto.sortBy}, ` +
        `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching all offerings: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  /**
   * Get single offering by ID with full cache control
   */
  async getOfferingById(
    dto: GetOfferingByIdRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      // ✅ EXPLICIT BOOLEAN CONVERSION
      const grpcRequest: GetOfferingByIdRequestDto = {
        id: dto.id,
        bypassCache: dto.bypassCache === true,
        refreshCache: dto.refreshCache === true,
        cacheTTL: dto.cacheTTL,
        readOnly: dto.readOnly === true,
      };

      this.logger.debug(
        `📤 Sending to gRPC - GetOfferingById: id=${grpcRequest.id}, ` +
        `bypassCache=${grpcRequest.bypassCache}, refreshCache=${grpcRequest.refreshCache}, readOnly=${grpcRequest.readOnly}`
      );

      const res = await firstValueFrom(
        this.grpcService.GetOfferingById(grpcRequest)
      );

      this.logger.debug(
        `GetOfferingById gRPC Response: id=${dto.id}, ` +
        `bypassCache=${dto.bypassCache}, refreshCache=${dto.refreshCache}`
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offering by id: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offering', 'FETCH_ERROR');
    }
  }

  // ===========================================================
  // USER-SPECIFIC METHODS (No Caching)
  // ===========================================================

  async getOfferingsByAccount(
    dto: GetOfferingsByAccountRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByAccount(dto)
      );

      this.logger.debug(`GetOfferingsByAccount gRPC Response: accountId=${dto.accountId}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by account: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  async getOfferingsByProfessional(
    dto: GetOfferingsByProfessionalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByProfessional(dto)
      );

      this.logger.debug(`GetOfferingsByProfessional gRPC Response: professionalUuid=${dto.professionalUuid}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by professional: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  // ===========================================================
  // CRUD OPERATIONS
  // ===========================================================

  async updateServiceOffering(
    id: string,
    dto: UpdateServiceOfferingDto,
    userId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateServiceOffering({
          id,
          userId,
          ...dto,
        })
      );

      this.logger.debug(`UpdateServiceOffering gRPC Response: id=${id}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error updating offering: ${error.message}`);
      return BaseResponseDto.fail('Failed to update offering', 'UPDATE_ERROR');
    } 
  }

  async deleteServiceOffering(
    id: string,
    userId: string,
  ): Promise<BaseResponseDto<null>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.DeleteServiceOffering({ id, userId })
      );

      this.logger.debug(`DeleteServiceOffering gRPC Response: id=${id}`);

      if (res?.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error deleting offering: ${error.message}`);
      return BaseResponseDto.fail('Failed to delete offering', 'DELETE_ERROR');
    }
  }
}