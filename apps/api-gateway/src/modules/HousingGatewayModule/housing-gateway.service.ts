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
} from '@pivota-api/dtos';


// This interface matches the 'service HousingService' definition in your housing.proto
interface HousingServiceGrpc {
  CreateHouseListing(
    data: CreateHouseListingGrpcRequestDto,
  ): Observable<BaseResponseDto<HouseListingResponseDto>>;

  GetHouseListingById(
    data: GetHouseListingByIdDto,
  ): Observable<BaseResponseDto<HouseListingResponseDto>>;

  GetListingsByOwner(
    data: GetListingsByOwnerDto,
  ): Observable<BaseResponseDto<HouseListingResponseDto[]>>;

  SearchListings(
    data: SearchHouseListingsDto,
  ): Observable<BaseResponseDto<HouseListingResponseDto[]>>;

  UpdateHouseListing(
    data: UpdateHouseListingGrpcRequestDto,
  ): Observable<BaseResponseDto<HouseListingResponseDto>>;

  UpdateListingStatus(
    data: UpdateHouseListingStatusDto,
  ): Observable<BaseResponseDto<HouseListingResponseDto>>;

  ArchiveHouseListing(
    data: ArchiveHouseListingsGrpcRequestDto,
  ): Observable<BaseResponseDto<null>>;

  ScheduleViewing(
    data: ScheduleViewingGrpcRequestDto,
  ): Observable<BaseResponseDto<HouseViewingResponseDto>>;
}

@Injectable()
export class HousingGatewayService {
  private readonly logger = new Logger(HousingGatewayService.name);
  private grpcService: HousingServiceGrpc;

  constructor(
    @Inject('HOUSING_PACKAGE') // Ensure this matches your ClientModule registration name
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<HousingServiceGrpc>('HousingService');
  }

  // ===========================================================
  // CREATE HOUSE LISTING
  // ===========================================================
  async createHouseListing(dto: CreateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CreateHouseListing(dto));
    this.logger.debug(`CreateHouseListing gRPC: ${res?.success ? 'SUCCESS' : 'FAILED'}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // SEARCH LISTINGS
  // ===========================================================
  async searchListings(dto: SearchHouseListingsDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.SearchListings(dto));
    this.logger.debug(`SearchListings gRPC: found ${res?.data?.length || 0} results`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET LISTING BY ID
  // ===========================================================
  async getHouseListingById(dto: { id: string }): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.GetHouseListingById(dto));
    
    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET LISTINGS BY OWNER
  // ===========================================================
  async getListingsByOwner(dto: { ownerId: string }): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetListingsByOwner(dto));
    
    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // UPDATE LISTING
  // ===========================================================
  async updateHouseListing( dto: UpdateHouseListingGrpcRequestDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    
    const res = await firstValueFrom(this.grpcService.UpdateHouseListing(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // UPDATE STATUS
  // ===========================================================
  async updateListingStatus(dto: UpdateHouseListingStatusDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.UpdateListingStatus(dto));
    
    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // ARCHIVE LISTING
  // ===========================================================
  async archiveHouseListing(dto: ArchiveHouseListingsGrpcRequestDto): Promise<BaseResponseDto<null>> {
    const res = await firstValueFrom(this.grpcService.ArchiveHouseListing(dto));
    
    if (res?.success) {
      return BaseResponseDto.ok(null, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // SCHEDULE VIEWING
  // ===========================================================
  async scheduleViewing( dto: ScheduleViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {

    const res = await firstValueFrom(this.grpcService.ScheduleViewing(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }
}