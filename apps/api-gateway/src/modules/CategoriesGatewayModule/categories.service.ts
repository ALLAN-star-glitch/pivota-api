import { Inject, Injectable , Logger} from '@nestjs/common';
import { BaseResponseDto, CreateCategoryRequestDto, CreateCategoryResponseDto } from '@pivota-api/dtos';
import { BaseCategoryGrpcResponse } from '@pivota-api/interfaces';
import { firstValueFrom, Observable } from 'rxjs';
import { ClientGrpc } from '@nestjs/microservices';


interface CategoriesServiceGrpc {

    CreateCategory( data: CreateCategoryRequestDto): Observable<BaseCategoryGrpcResponse<CreateCategoryResponseDto> | null>;

}



@Injectable()
export class CategoriesService {

    private readonly logger = new Logger(CategoriesService.name)
    private grpcService: CategoriesServiceGrpc;

    constructor (
           @Inject('CATEGORIES_PACKAGE')
           private readonly grpcClient: ClientGrpc
    ) {

        this.grpcService = this.grpcClient.getService<CategoriesServiceGrpc>('CategoriesService');

    }


     // Create a user
        async  createUser(dto: CreateCategoryRequestDto ): Promise<BaseResponseDto<CreateCategoryResponseDto> | null> {

            const res = await firstValueFrom(this.grpcService.CreateCategory(dto));
            this.logger.debug(`gRPC response from user service: ${JSON.stringify(res)}`);
            
            if (res.success) {
                return BaseResponseDto.ok(res.category, res.message, res.code);
            }
            
            return BaseResponseDto.fail(res.message, res.code); 

        }
            

   

}
