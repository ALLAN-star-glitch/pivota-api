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

  // -----------------------------
  // CREATE HOUSE LISTING
  // -----------------------------
  @GrpcMethod('HousingService', 'CreateHouseListing')
  async createHouseListing(
    data: CreateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    this.logger.debug(`CreateHouseListing Request: ${JSON.stringify(data)}`);
    return this.housingService.createHouseListing(data);
  }

  // -----------------------------
  // GET HOUSE LISTING BY ID
  // -----------------------------
  @GrpcMethod('HousingService', 'GetHouseListingById')
  async getHouseListingById(
    data: GetHouseListingByIdDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(`GetHouseListingById Request: ${data.id}`);
    return this.housingService.getHouseListingById(data);
  }

  // -----------------------------
  // SEARCH LISTINGS (Discovery)
  // -----------------------------
  @GrpcMethod('HousingService', 'SearchListings')
  async searchListings(
    data: SearchHouseListingsDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(`SearchListings Request: ${JSON.stringify(data)}`);
    return this.housingService.searchListings(data);
  }

  // -----------------------------
  // GET LISTINGS BY OWNER (Dashboard)
  // -----------------------------
  @GrpcMethod('HousingService', 'GetListingsByOwner')
  async getListingsByOwner(
    data: GetListingsByOwnerDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(`GetListingsByOwner Request: ${data.ownerId}`);
    return this.housingService.getListingsByOwner(data);
  }

  // -----------------------------
  // UPDATE LISTING DETAILS
  // -----------------------------
  @GrpcMethod('HousingService', 'UpdateHouseListing')
  async updateHouseListing(
    data: UpdateHouseListingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(`UpdateHouseListing Request: ${JSON.stringify(data)}`);
    return this.housingService.updateHouseListing( data);
  }

  // -----------------------------
  // UPDATE LISTING STATUS (Archive/Rented/Available)
  // -----------------------------
  @GrpcMethod('HousingService', 'UpdateListingStatus')
  async updateListingStatus(
    data: UpdateHouseListingStatusDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.debug(`UpdateListingStatus Request: ${JSON.stringify(data)}`);
    return this.housingService.updateListingStatus(data);
  }

  // -----------------------------
  // ARCHIVE LISTING (Soft Delete)
  // -----------------------------
  @GrpcMethod('HousingService', 'ArchiveHouseListing')
  async archiveHouseListing(
    data: ArchiveHouseListingsGrpcRequestDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.debug(`ArchiveHouseListing Request: ${data.id}`);
    return this.housingService.archiveHouseListing(data);
  }

  // -----------------------------
  // SCHEDULE A VIEWING
  // -----------------------------
  @GrpcMethod('HousingService', 'ScheduleViewing')
  async scheduleViewing(
    data: ScheduleViewingGrpcRequestDto,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    this.logger.debug(`ScheduleViewing Request: ${JSON.stringify(data)}`);
    return this.housingService.scheduleViewing(data);
  }
}