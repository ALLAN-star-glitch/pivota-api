import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ListingRegistryService } from './listing-registry.service';
import { 
  AdminListingFilterDto, 
  BaseResponseDto, 
  ListingRegistryDataDto 
} from '@pivota-api/dtos';

@Controller()
export class ListingRegistryController {
  constructor(private readonly listingRegistryService: ListingRegistryService) {}

  /**
   * gRPC endpoint for users to fetch their own listings across all pillars.
   * Maps to: rpc GetOwnListings (GetOwnListingsRequest) returns (GetOwnListingsResponse)
   */
  @GrpcMethod('ListingRegistryService', 'GetOwnListings')
  async getOwnListings(data: { accountId: string }): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    // accountId is extracted from the JWT in the Gateway and passed via gRPC
    return await this.listingRegistryService.getOwnListings(data.accountId);
  }

  

  /**
   * gRPC endpoint for admins to fetch listings for specific users or the whole system.
   * Maps to: rpc GetAdminListings (AdminListingFilter) returns (GetAdminListingsResponse)
   */
  @GrpcMethod('ListingRegistryService', 'GetAdminListings')
  async getAdminListings(query: AdminListingFilterDto): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    // This allows administrators to perform targeted lookups across all vertical tables
    return await this.listingRegistryService.getAdminListings(query);
  }
}