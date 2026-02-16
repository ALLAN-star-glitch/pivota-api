import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  HouseListingResponseDto,
  SearchHouseListingsDto,
  GetHouseListingByIdDto,
  GetListingsByOwnerDto,
  UpdateHouseListingStatusDto,
  HouseViewingResponseDto,
  ScheduleViewingGrpcRequestDto,
  UpdateHouseListingGrpcRequestDto,
  CreateHouseListingGrpcRequestDto,
  ArchiveHouseListingsGrpcRequestDto,
  HouseListingCreateResponseDto,
  GetAdminHousingFilterDto, // Added missing import
} from '@pivota-api/dtos';

// Updated interface to include Admin-specific gRPC calls
interface HousingServiceGrpc {
  CreateHouseListing(data: CreateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingCreateResponseDto>>;
  CreateAdminHouseListing(data: CreateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingCreateResponseDto>>;

  UpdateHouseListing(data: UpdateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingResponseDto>>;
  UpdateAdminHouseListing(data: UpdateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingResponseDto>>;

  GetHouseListingById(data: GetHouseListingByIdDto): Observable<BaseResponseDto<HouseListingResponseDto>>;
  GetListingsByOwner(data: GetListingsByOwnerDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;
  GetAdminListings(data: GetAdminHousingFilterDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;

  SearchListings(data: SearchHouseListingsDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;
  UpdateListingStatus(data: UpdateHouseListingStatusDto): Observable<BaseResponseDto<HouseListingResponseDto>>;
  ArchiveHouseListing(data: ArchiveHouseListingsGrpcRequestDto): Observable<BaseResponseDto<null>>;
  ScheduleViewing(data: ScheduleViewingGrpcRequestDto): Observable<BaseResponseDto<HouseViewingResponseDto>>;
}

@Injectable()
export class HousingGatewayService {
  private readonly logger = new Logger(HousingGatewayService.name);
  private grpcService: HousingServiceGrpc;

  constructor(
    @Inject('HOUSING_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<HousingServiceGrpc>('HousingService');
  }

  // ===========================================================
  // CREATE METHODS
  // ===========================================================
  async createHouseListing(dto: CreateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CreateHouseListing(dto));
    return this.handleGrpcResponse(res, 'CreateHouseListing');
  }

  async createAdminHouseListing(dto: CreateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CreateAdminHouseListing(dto));
    return this.handleGrpcResponse(res, 'CreateAdminHouseListing');
  }

  // ===========================================================
  // UPDATE METHODS
  // ===========================================================
  async updateHouseListing(dto: UpdateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.UpdateHouseListing(dto));
    return this.handleGrpcResponse(res, 'UpdateHouseListing');
  }

  async updateAdminHouseListing(dto: UpdateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.UpdateAdminHouseListing(dto));
    return this.handleGrpcResponse(res, 'UpdateAdminHouseListing');
  }

  // ===========================================================
  // READ METHODS
  // ===========================================================
  async getAdminListings(dto: GetAdminHousingFilterDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetAdminListings(dto));
    return this.handleGrpcResponse(res, 'GetAdminListings');
  }

  // FIXED: Changed parameter type from { ownerId: string } to GetListingsByOwnerDto
  async getListingsByOwner(dto: GetListingsByOwnerDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetListingsByOwner(dto));
    return this.handleGrpcResponse(res, 'GetListingsByOwner');
  }

  // FIXED: Changed parameter type from { id: string } to GetHouseListingByIdDto
  async getHouseListingById(dto: GetHouseListingByIdDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.GetHouseListingById(dto));
    return this.handleGrpcResponse(res, 'GetHouseListingById');
  }

  async searchListings(dto: SearchHouseListingsDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.SearchListings(dto));
    return this.handleGrpcResponse(res, 'SearchListings');
  }

  // ===========================================================
  // UTILITY METHODS
  // ===========================================================
  async scheduleViewing(dto: ScheduleViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.ScheduleViewing(dto));
    return this.handleGrpcResponse(res, 'ScheduleViewing');
  }

  async archiveHouseListing(dto: ArchiveHouseListingsGrpcRequestDto): Promise<BaseResponseDto<null>> {
    const res = await firstValueFrom(this.grpcService.ArchiveHouseListing(dto));
    return this.handleGrpcResponse(res, 'ArchiveHouseListing');
  }

  async updateListingStatus(dto: UpdateHouseListingStatusDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.UpdateListingStatus(dto));
    return this.handleGrpcResponse(res, 'UpdateListingStatus');
  }

  /**
   * Universal handler to standardize gRPC response mapping
   */
  private handleGrpcResponse<T>(res: BaseResponseDto<T>, methodName: string): BaseResponseDto<T> {
    this.logger.debug(`${methodName} gRPC: ${res?.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    
    return BaseResponseDto.fail(
      res?.message || `Internal error in ${methodName}`, 
      res?.code || 'INTERNAL_ERROR'
    );
  }
}