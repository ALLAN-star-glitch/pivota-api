import { Body, Controller, Logger, Post, Version } from '@nestjs/common';
import { BaseResponseDto, CreateCategoryRequestDto, CreateCategoryResponseDto } from '@pivota-api/dtos';
import { CategoriesService } from './categories.service';

@Controller('listings-service')
export class CategoriesController {

     private readonly logger = new Logger(CategoriesController.name);
    
      constructor(private readonly userService: CategoriesService) {}

      //Create Job Category
      @Version('1')
      @Post('categories')
      async createCategory(@Body() dto: CreateCategoryRequestDto): Promise<BaseResponseDto<CreateCategoryResponseDto>> { 
        
        return this.userService.createUser(dto);    
        
        
      }



}
