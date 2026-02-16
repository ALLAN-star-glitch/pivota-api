import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  HouseListingResponseDto,
  SearchHouseListingsDto,
  UpdateHouseListingStatusDto,
  HouseViewingResponseDto,
  GetHouseListingByIdDto,
  GetListingsByOwnerDto,
  GetAdminHousingFilterDto,
  UpdateHouseListingGrpcRequestDto,
  ScheduleViewingGrpcRequestDto,
  CreateHouseListingGrpcRequestDto,
  ArchiveHouseListingsGrpcRequestDto,
  HouseListingCreateResponseDto,
} from '@pivota-api/dtos';
import { HousingService } from './housing.service';

@Controller('housing')
export class HousingController {
  private readonly logger = new Logger(HousingController.name);

  constructor(private readonly housingService: HousingService) {}

  // ===========================================================
  // CREATE METHODS
  // ===========================================================

  @GrpcMethod('HousingService', 'CreateHouseListing')
  async createHouseListing(
    data: CreateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    this.logger.debug(`CreateHouseListing Request for creator: ${data.creatorId}`);
    return this.housingService.createHouseListing(data);
  }

  @GrpcMethod('HousingService', 'CreateAdminHouseListing')
  async createAdminHouseListing(
    data: CreateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    this.logger.debug(`CreateAdminHouseListing Request by admin`);
    return this.housingService.createAdminHouseListing(data);
  }

  // ===========================================================
  // READ METHODS
  // ===========================================================

  @GrpcMethod('HousingService', 'GetHouseListingById')
  async getHouseListingById(
    data: GetHouseListingByIdDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(`GetHouseListingById Request: ${data.id}`);
    return this.housingService.getHouseListingById(data);
  }

  @GrpcMethod('HousingService', 'SearchListings')
  async searchListings(
    data: SearchHouseListingsDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(`SearchListings Request: ${JSON.stringify(data)}`);
    return this.housingService.searchListings(data);
  }

  @GrpcMethod('HousingService', 'GetListingsByOwner')
  async getListingsByOwner(
    data: GetListingsByOwnerDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(`GetListingsByOwner Request for Account: ${data.ownerId}`);
    return this.housingService.getListingsByOwner(data);
  }
  
  @GrpcMethod('HousingService', 'GetAdminListings')
  async getAdminListings(
    data: GetAdminHousingFilterDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(`GetAdminListings Request with filters: ${JSON.stringify(data)}`);
    return this.housingService.getAdminListings(data);
  }


  // ===========================================================
  // UPDATE METHODS
  // ===========================================================

  @GrpcMethod('HousingService', 'UpdateHouseListing')
  async updateHouseListing(
    data: UpdateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(`UpdateHouseListing Request: ${data.listingId}`);
    return this.housingService.updateHouseListing(data);
  }


  @GrpcMethod('HousingService', 'UpdateAdminHouseListing')
  async updateAdminHouseListing(
    data: UpdateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(`UpdateAdminHouseListing Request for listing: ${data.listingId}`);
    return this.housingService.updateAdminHouseListing(data);
  }

  @GrpcMethod('HousingService', 'UpdateListingStatus')
  async updateListingStatus(
    data: UpdateHouseListingStatusDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(`UpdateListingStatus Request to ${data.status} for listing: ${data.id}`);
    return this.housingService.updateListingStatus(data);
  }

  // ===========================================================
  // UTILITY METHODS
  // ===========================================================

  @GrpcMethod('HousingService', 'ArchiveHouseListing')
  async archiveHouseListing(
    data: ArchiveHouseListingsGrpcRequestDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.debug(`ArchiveHouseListing Request: ${data.id}`);
    return this.housingService.archiveHouseListing(data);
  }

  @GrpcMethod('HousingService', 'ScheduleViewing')
  async scheduleViewing(
    data: ScheduleViewingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    this.logger.debug(`ScheduleViewing Request: ${JSON.stringify(data)}`);
    return this.housingService.scheduleViewing(data);
  }
}