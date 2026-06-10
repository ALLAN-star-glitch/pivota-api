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
    data: { accountId: string },
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingsByProfessional(
    data: { professionalId: string },
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingById(
    data: { id: string },
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  UpdateServiceOffering(
    data: { id: string; userId: string } & UpdateServiceOfferingDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  DeleteServiceOffering(
    data: { id: string; userId: string },
  ): Observable<BaseResponseDto<null>>;

  GetOfferingsByCategory(
    data: { 
      categoryId: string; 
      limit?: number; 
      offset?: number;
      city?: string;
      minPrice?: number;
      maxPrice?: number;
    }
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

  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetOfferingsByVertical(dto));

      this.logger.debug(`GetOfferingsByVertical gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch providers', 'FETCH_ERROR');
    }
  }

  async getOfferingsByAccount(
    accountId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByAccount({ accountId })
      );

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
    professionalId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByProfessional({ professionalId })
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by professional: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  async getOfferingById(
    id: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingById({ id })
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

      if (res?.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error deleting offering: ${error.message}`);
      return BaseResponseDto.fail('Failed to delete offering', 'DELETE_ERROR');
    }
  }

  async getOfferingsByCategory(
    categoryId: string,
    limit?: number,
    offset?: number,
    city?: string,
    minPrice?: number,
    maxPrice?: number,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByCategory({ 
          categoryId, 
          limit: limit || 20, 
          offset: offset || 0,
          city,
          minPrice,
          maxPrice,
        })
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
}