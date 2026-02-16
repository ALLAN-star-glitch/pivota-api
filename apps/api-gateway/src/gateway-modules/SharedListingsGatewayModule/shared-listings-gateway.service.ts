import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { 
  AdminListingFilterDto, 
  BaseResponseDto, 
  ListingRegistryDataDto 
} from '@pivota-api/dtos';

// This interface must match the service definition in your .proto file
interface ListingRegistryServiceClient {
  getOwnListings(data: { accountId: string }): Observable<BaseResponseDto<ListingRegistryDataDto>>;
  getAdminListings(query: AdminListingFilterDto): Observable<BaseResponseDto<ListingRegistryDataDto>>;
}

@Injectable()
export class SharedListingsGatewayService implements OnModuleInit {
  private readonly logger = new Logger(SharedListingsGatewayService.name);
  private registryService: ListingRegistryServiceClient;

  constructor(@Inject('LISTINGS_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    // This matches the 'service' name in your proto file
    this.registryService = this.client.getService<ListingRegistryServiceClient>('ListingRegistryService');
  }

  /**
   * Forwards request to fetch listings belonging to the authenticated user.
   */
  async getOwnListings(accountId: string): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    try {
      this.logger.debug(`Gateway: Fetching own listings for ${accountId}`);
      // Use firstValueFrom to convert the gRPC Observable to a Promise
      return await firstValueFrom(this.registryService.getOwnListings({ accountId }));
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Gateway Error (getOwnListings): ${err.message}`);
      return BaseResponseDto.fail('Registry service currently unavailable', 'SERVICE_UNAVAILABLE');
    }
  }

  /**
   * Forwards administrative request to fetch listings for any user/filter.
   */
  async getAdminListings(query: AdminListingFilterDto): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    try {
      this.logger.debug(`Gateway: Admin lookup with filters: ${JSON.stringify(query)}`);
      return await firstValueFrom(this.registryService.getAdminListings(query));
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Gateway Error (getAdminListings): ${err.message}`);
      return BaseResponseDto.fail('Admin registry lookup failed', 'INTERNAL_ERROR');
    }
  }
}