import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class JobApplicationAttachmentDto {
  @ApiProperty({
    description: 'The category of the attachment. Use COVER_LETTER for written pitches.',
    enum: ['CV', 'COVER_LETTER', 'ID', 'CERTIFICATE', 'LICENSE', 'PORTFOLIO', 'OTHER'],
    example: 'CV'
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({ 
    description: 'The secure URL of the uploaded file. Required if contentText is empty.',
    example: 'https://storage.pivota.connect/docs/user123-cv.pdf' 
  })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({ 
    description: 'The original name of the file for display purposes.',
    example: 'John_Doe_Resume_2025.pdf' 
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ 
    description: 'Raw text content. Used for "Quick Pitch" or typed cover letters instead of a file upload.',
    example: 'I have extensive experience in electrical wiring for residential buildings.' 
  })
  @IsOptional()
  @IsString()
  contentText?: string;

  @ApiPropertyOptional({ 
    description: 'If true, this attachment will be highlighted as the main document for the employer to see first.',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}