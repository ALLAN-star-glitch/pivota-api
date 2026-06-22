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
  GetAdminHousingFilterDto,
  ScheduleAdminViewingGrpcRequestDto,
  GetHouseListingsByCategoryDto,
  GetAllHouseListingsRequestDto, 
} from '@pivota-api/dtos';

import { StorageService } from '@pivota-api/shared-storage';

// Updated interface to include all methods with cache control
interface HousingServiceGrpc {
  // Create
  CreateHouseListing(data: CreateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingCreateResponseDto>>;
  CreateAdminHouseListing(data: CreateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingCreateResponseDto>>;

  // Update
  UpdateHouseListing(data: UpdateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingResponseDto>>;
  UpdateAdminHouseListing(data: UpdateHouseListingGrpcRequestDto): Observable<BaseResponseDto<HouseListingResponseDto>>;

  // ===================================================
  // READ METHODS (WITH CACHE CONTROL)
  // ===================================================
  GetHouseListingById(data: GetHouseListingByIdDto): Observable<BaseResponseDto<HouseListingResponseDto>>;
  GetListingsByOwner(data: GetListingsByOwnerDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;
  GetAdminListings(data: GetAdminHousingFilterDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;
  SearchListings(data: SearchHouseListingsDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;
  
  // ===================================================
  // NEW: GET HOUSE LISTINGS BY CATEGORY (WITH CACHE CONTROL)
  // ===================================================
  GetHouseListingsByCategory(data: GetHouseListingsByCategoryDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;

  // Utility
  UpdateListingStatus(data: UpdateHouseListingStatusDto): Observable<BaseResponseDto<HouseListingResponseDto>>;
  ArchiveHouseListing(data: ArchiveHouseListingsGrpcRequestDto): Observable<BaseResponseDto<null>>;

  // Viewings
  ScheduleViewing(data: ScheduleViewingGrpcRequestDto): Observable<BaseResponseDto<HouseViewingResponseDto>>;
  ScheduleAdminViewing(data: ScheduleAdminViewingGrpcRequestDto): Observable<BaseResponseDto<HouseViewingResponseDto>>;

   GetAllHouseListings(data: GetAllHouseListingsRequestDto): Observable<BaseResponseDto<HouseListingResponseDto[]>>;
}

@Injectable()
export class HousingGatewayService {
  private readonly logger = new Logger(HousingGatewayService.name);
  private grpcService: HousingServiceGrpc;

  constructor(
    @Inject('HOUSING_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
    private readonly storage: StorageService,
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
  // READ METHODS (WITH CACHE CONTROL)
  // ===========================================================

  async getAdminListings(dto: GetAdminHousingFilterDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetAdminListings(dto));
    return this.handleGrpcResponse(res, 'GetAdminListings');
  }

  async getListingsByOwner(dto: GetListingsByOwnerDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetListingsByOwner: ownerId=${dto.ownerId}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const res = await firstValueFrom(this.grpcService.GetListingsByOwner(dto));
    return this.handleGrpcResponse(res, 'GetListingsByOwner');
  }

  async getHouseListingWithTracking(dto: GetHouseListingByIdDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetHouseListingById: id=${dto.id}, ` +
      `bypassCache=${dto.bypassCache}, refreshCache=${dto.refreshCache}`
    );
    const res = await firstValueFrom(this.grpcService.GetHouseListingById(dto));
    return this.handleGrpcResponse(res, 'GetHouseListingById');
  }

  async searchListings(dto: SearchHouseListingsDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - SearchListings: city=${dto.city}, listingType=${dto.listingType}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const res = await firstValueFrom(this.grpcService.SearchListings(dto));
    return this.handleGrpcResponse(res, 'SearchListings');
  }

  // ===================================================
  // NEW: GET HOUSE LISTINGS BY CATEGORY (WITH CACHE CONTROL)
  // ===================================================
  async getHouseListingsByCategory(dto: GetHouseListingsByCategoryDto): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetHouseListingsByCategory: categoryId=${dto.categoryId}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const res = await firstValueFrom(this.grpcService.GetHouseListingsByCategory(dto));
    return this.handleGrpcResponse(res, 'GetHouseListingsByCategory');
  }

  // ===========================================================
  // UTILITY METHODS
  // ===========================================================

  async scheduleViewing(dto: ScheduleViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.ScheduleViewing(dto));
    return this.handleGrpcResponse(res, 'ScheduleViewing');
  }

  async scheduleAdminViewing(dto: ScheduleAdminViewingGrpcRequestDto): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.ScheduleAdminViewing(dto));
    return this.handleGrpcResponse(res, 'ScheduleAdminViewing');
  }

  async archiveHouseListing(dto: ArchiveHouseListingsGrpcRequestDto): Promise<BaseResponseDto<null>> {
    const res = await firstValueFrom(this.grpcService.ArchiveHouseListing(dto));
    return this.handleGrpcResponse(res, 'ArchiveHouseListing');
  }

  async updateListingStatus(dto: UpdateHouseListingStatusDto): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const res = await firstValueFrom(this.grpcService.UpdateListingStatus(dto));
    return this.handleGrpcResponse(res, 'UpdateListingStatus');
  }

  // ===========================================================
  // PRIVATE HELPERS
  // ===========================================================

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

  /**
   * Uploads multiple files. 
   * Defaults to 'pivota-public' for general housing images.
   */
  async uploadMultipleToStorage(
    files: Express.Multer.File[], 
    folder: string, 
    bucketName = 'pivota-public'
  ): Promise<string[]> {
    if (!files || files.length === 0) return [];

    return Promise.all(
      files.map(file => this.storage.uploadFile(file, folder, bucketName))
    );
  }

  /**
   * Single file upload helper
   */
  async uploadToStorage(
    file: Express.Multer.File, 
    folder: string, 
    bucketName = 'pivota-public'
  ): Promise<string> {
    return this.storage.uploadFile(file, folder, bucketName);
  }

  /**
   * Cleans up files from storage.
   * Use this when a listing creation fails after images have already been uploaded.
   */
  async deleteFromStorage(
    urls: string[], 
    bucketName = 'pivota-public'
  ): Promise<void> {
    if (!urls || urls.length === 0) return;

    try {
      this.logger.warn(`Initiating storage cleanup for ${urls.length} files in ${bucketName}`);
      await this.storage.deleteFiles(urls, bucketName);
    } catch (error) {
      this.logger.error(
        `Failed to clean up orphaned files: ${error instanceof Error ? error.message : 'Unknown Error'}`
      );
    }
  }

  async getAllHouseListings(
    dto: GetAllHouseListingsRequestDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetAllHouseListings: limit=${dto.limit}, offset=${dto.offset}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const res = await firstValueFrom(this.grpcService.GetAllHouseListings(dto));
    return this.handleGrpcResponse(res, 'GetAllHouseListings');
  }
}