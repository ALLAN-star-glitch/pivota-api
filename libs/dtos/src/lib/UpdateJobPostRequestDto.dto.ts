import { ApiPropertyOptional, PartialType } from "@nestjs/swagger"; // Change this import
import { CreateJobPostDto } from "./CreateJobPostDto.dto";

export class UpdateJobPostRequestDto extends PartialType(CreateJobPostDto) {
    @ApiPropertyOptional({ 
      description: 'The internal DB ID of the job post', 
      example: 'cl3k1n4fj0000xyz123abc' 
    })
    id?: string;
}