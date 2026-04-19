// apps/gateway/src/modules/profile/media.controller.ts

import {
  Controller,
  Post,
  Delete,
  Get,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Req,
  Body,
  Param,
  Version,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { BaseResponseDto } from '@pivota-api/dtos';
import { imageFileFilter, documentFileFilter } from '@pivota-api/filters';
import { MediaService, MediaUploadMultipleResponseDto, MediaUploadResponseDto } from '../services/media.service';

@ApiTags('Profile Media')
@ApiBearerAuth()
@Controller('profile-media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  // ===========================================================
  // PROFILE PICTURE
  // ===========================================================

  @Post('profile-picture')
  @Version('1')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload profile picture',
    description: 'Upload a profile picture for the authenticated user (max 2MB)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Profile image (JPG, PNG, WEBP)' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile picture uploaded successfully'
  })
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const response = await this.mediaService.uploadProfilePicture(file, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // LOGO
  // ===========================================================

  @Post('logo')
  @Version('1')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload company logo',
    description: 'Upload a company logo for business accounts (max 2MB)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Logo image (JPG, PNG, WEBP)' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logo uploaded successfully'
  })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const response = await this.mediaService.uploadLogo(file, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // COVER PHOTO
  // ===========================================================

  @Post('cover-photo')
  @Version('1')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload cover photo',
    description: 'Upload a cover/banner photo for profile (max 2MB)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Cover image (JPG, PNG, WEBP)' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cover photo uploaded successfully'
  })
  async uploadCoverPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const response = await this.mediaService.uploadCoverPhoto(file, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // CV / RESUME
  // ===========================================================

  @Post('cv')
  @Version('1')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: documentFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload CV/Resume',
    description: 'Upload a CV document for job seeker profile (max 5MB)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CV file (PDF, DOC, DOCX, TXT)' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CV uploaded successfully'
  })
  async uploadCV(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const response = await this.mediaService.uploadCV(file, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // JOB SEEKER PORTFOLIO
  // ===========================================================

  @Post('portfolio/job-seeker')
  @Version('1')
  @UseInterceptors(FilesInterceptor('files', 10, {
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload job seeker portfolio images',
    description: 'Upload up to 10 portfolio images for job seeker profile (max 5MB each)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { 
          type: 'array', 
          items: { type: 'string', format: 'binary' },
          description: 'Portfolio images for job seeker'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job seeker portfolio images uploaded successfully'
  })
  async uploadJobSeekerPortfolio(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const response = await this.mediaService.uploadJobSeekerPortfolioImages(files, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/job-seeker')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get job seeker portfolio images',
    description: 'Get all portfolio images for job seeker profile'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio images retrieved successfully'
  })
  async getJobSeekerPortfolio(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<{ urls: string[] }>> {
    const response = await this.mediaService.getJobSeekerPortfolioImages(req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('portfolio/job-seeker/:imageUrl')
  @Version('1')
  @ApiOperation({ 
    summary: 'Delete job seeker portfolio image',
    description: 'Delete a specific portfolio image from job seeker profile'
  })
  @ApiParam({ 
    name: 'imageUrl', 
    description: 'URL of the image to delete (URL encoded)',
    example: 'https%3A%2F%2Fcdn.pivota.com%2Fportfolio%2Faccount-123%2Fimage.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio image deleted successfully'
  })
  async deleteJobSeekerPortfolioImage(
    @Param('imageUrl') imageUrl: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    // Decode the URL parameter
    const decodedUrl = decodeURIComponent(imageUrl);
    const response = await this.mediaService.deleteJobSeekerPortfolioImage(decodedUrl, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // SKILLED PROFESSIONAL PORTFOLIO
  // ===========================================================

  @Post('portfolio/skilled-professional')
  @Version('1')
  @UseInterceptors(FilesInterceptor('files', 10, {
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload skilled professional portfolio images',
    description: 'Upload up to 10 portfolio images for skilled professional profile (max 5MB each)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { 
          type: 'array', 
          items: { type: 'string', format: 'binary' },
          description: 'Portfolio images for skilled professional'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skilled professional portfolio images uploaded successfully'
  })
  async uploadSkilledProfessionalPortfolio(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const response = await this.mediaService.uploadSkilledProfessionalPortfolioImages(files, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/skilled-professional')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get skilled professional portfolio images',
    description: 'Get all portfolio images for skilled professional profile'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio images retrieved successfully'
  })
  async getSkilledProfessionalPortfolio(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<{ urls: string[] }>> {
    const response = await this.mediaService.getSkilledProfessionalPortfolioImages(req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('portfolio/skilled-professional/:imageUrl')
  @Version('1')
  @ApiOperation({ 
    summary: 'Delete skilled professional portfolio image',
    description: 'Delete a specific portfolio image from skilled professional profile'
  })
  @ApiParam({ 
    name: 'imageUrl', 
    description: 'URL of the image to delete (URL encoded)',
    example: 'https%3A%2F%2Fcdn.pivota.com%2Fportfolio%2Faccount-123%2Fimage.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio image deleted successfully'
  })
  async deleteSkilledProfessionalPortfolioImage(
    @Param('imageUrl') imageUrl: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const decodedUrl = decodeURIComponent(imageUrl);
    const response = await this.mediaService.deleteSkilledProfessionalPortfolioImage(decodedUrl, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // CERTIFICATIONS
  // ===========================================================

  @Post('certifications')
  @Version('1')
  @UseInterceptors(FilesInterceptor('files', 10, {
    fileFilter: documentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload certifications',
    description: 'Upload up to 10 certification documents (max 10MB each)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { 
          type: 'array', 
          items: { type: 'string', format: 'binary' },
          description: 'Certification documents (PDF, JPG, PNG)'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certifications uploaded successfully'
  })
  async uploadCertifications(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const response = await this.mediaService.uploadCertifications(files, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('certifications')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get certifications',
    description: 'Get all certification documents for skilled professional profile'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certifications retrieved successfully'
  })
  async getCertifications(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<{ urls: string[] }>> {
    const response = await this.mediaService.getCertifications(req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('certifications/:certificationUrl')
  @Version('1')
  @ApiOperation({ 
    summary: 'Delete certification',
    description: 'Delete a specific certification document'
  })
  @ApiParam({ 
    name: 'certificationUrl', 
    description: 'URL of the certification to delete (URL encoded)',
    example: 'https%3A%2F%2Fcdn.pivota-private.com%2Fcertifications%2Faccount-123%2Fcert.pdf'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification deleted successfully'
  })
  async deleteCertification(
    @Param('certificationUrl') certificationUrl: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const decodedUrl = decodeURIComponent(certificationUrl);
    const response = await this.mediaService.deleteCertification(decodedUrl, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // GENERIC FILE DELETE
  // ===========================================================

  @Delete('file')
  @Version('1')
  @ApiOperation({ 
    summary: 'Delete a file',
    description: 'Delete a previously uploaded file by URL'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url', 'bucketName'],
      properties: {
        url: { type: 'string', example: 'https://cdn.pivota.com/profiles/user-123/avatar.jpg' },
        bucketName: { type: 'string', enum: ['pivota-public', 'pivota-private'], default: 'pivota-public' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File deleted successfully'
  })
  async deleteFile(
    @Body() data: { url: string; bucketName: string },
  ): Promise<BaseResponseDto<null>> {
    const response = await this.mediaService.deleteFile(data.url, data.bucketName);
    if (!response.success) throw response;
    return response;
  }
}