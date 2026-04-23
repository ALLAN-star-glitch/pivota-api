

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
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
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
import { BaseResponseDto, BulkDeleteResultDto, CertificationResponseDto, MediaUploadMultipleResponseDto, MediaUploadResponseDto, PortfolioItemDto, PortfolioResponseDto } from '@pivota-api/dtos';
import { imageFileFilter, documentFileFilter, portfolioFileFilter } from '@pivota-api/filters';
import { 
  MediaService, 
} from '../services/media.service';

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
  // CV RETRIEVAL
  // ===========================================================

  @Get('cv')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get CV signed URL',
    description: 'Get a signed URL for the authenticated user\'s CV document (valid for 1 hour)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CV retrieved successfully'
  })
  async getCV(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<{ url: string; fileName: string }>> {
    const response = await this.mediaService.getCV(req);
    if (!response.success) throw response;
    return response;
  }

  @Get('cv/download')
  @Version('1')
  @ApiOperation({ 
    summary: 'Download CV/Resume',
    description: 'Download the CV document for the authenticated user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CV downloaded successfully'
  })
  async downloadCV(
    @Req() req: JwtRequest,
    @Res() res: Response
  ): Promise<void> {
    const response = await this.mediaService.downloadCV(req);
    if (!response.success) throw response;
    
    const { buffer, mimeType, fileName } = response.data;
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  // ===========================================================
  // JOB SEEKER PORTFOLIO
  // ===========================================================

  @Post('portfolio/job-seeker')
  @Version('1')
  @UseInterceptors(FilesInterceptor('files', 5, {
    fileFilter: portfolioFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload job seeker portfolio items',
    description: 'Upload up to 5 portfolio items for job seeker profile (max 5MB each)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { 
          type: 'array', 
          items: { type: 'string', format: 'binary' },
          description: 'Portfolio items (images or documents)'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job seeker portfolio items uploaded successfully'
  })
  async uploadJobSeekerPortfolio(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const response = await this.mediaService.uploadJobSeekerPortfolioItems(files, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/job-seeker')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get all job seeker portfolio items',
    description: 'Get all portfolio items for job seeker profile'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio items retrieved successfully'
  })
  async getAllJobSeekerPortfolio(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const response = await this.mediaService.getJobSeekerPortfolioItems(req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/job-seeker/:itemUrl')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get a specific job seeker portfolio item',
    description: 'Get a specific portfolio item from job seeker profile'
  })
  @ApiParam({ 
    name: 'itemUrl', 
    description: 'URL of the item to retrieve (URL encoded)',
    example: 'https%3A%2F%2Fcdn.pivota.com%2Fportfolio%2Faccount-123%2Ffile.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item retrieved successfully'
  })
  async getJobSeekerPortfolioItem(
    @Param('itemUrl') itemUrl: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const decodedUrl = decodeURIComponent(itemUrl);
    const response = await this.mediaService.getJobSeekerPortfolioItem(decodedUrl, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/job-seeker/path/:path')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get job seeker portfolio item by path',
    description: 'Get a specific portfolio item from job seeker profile using its path'
  })
  @ApiParam({ 
    name: 'path', 
    description: 'Path of the item to retrieve (URL encoded)',
    example: 'portfolio%2Faccount-123%2Ffile.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item retrieved successfully'
  })
  async getJobSeekerPortfolioItemByPath(
    @Param('path') path: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const decodedPath = decodeURIComponent(path);
    const response = await this.mediaService.getJobSeekerPortfolioItemByPath(decodedPath, req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('portfolio/job-seeker/:itemUrl')
  @Version('1')
  @ApiOperation({ 
    summary: 'Delete job seeker portfolio item',
    description: 'Delete a specific portfolio item from job seeker profile'
  })
  @ApiParam({ 
    name: 'itemUrl', 
    description: 'URL of the item to delete (URL encoded)',
    example: 'https%3A%2F%2Fcdn.pivota.com%2Fportfolio%2Faccount-123%2Ffile.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item deleted successfully'
  })
  async deleteJobSeekerPortfolioItem(
    @Param('itemUrl') itemUrl: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const decodedUrl = decodeURIComponent(itemUrl);
    const response = await this.mediaService.deleteJobSeekerPortfolioItem(decodedUrl, req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('portfolio/job-seeker/bulk')
  @Version('1')
  @ApiOperation({ 
    summary: 'Bulk delete job seeker portfolio items',
    description: 'Delete multiple portfolio items from job seeker profile'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['itemUrls'],
      properties: {
        itemUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of item URLs to delete'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio items deleted successfully'
  })
  async bulkDeleteJobSeekerPortfolioItems(
    @Body() data: { itemUrls: string[] },
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const response = await this.mediaService.bulkDeleteJobSeekerPortfolioItems(data.itemUrls, req);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // SKILLED PROFESSIONAL PORTFOLIO
  // ===========================================================

  @Post('portfolio/skilled-professional')
  @Version('1')
  @UseInterceptors(FilesInterceptor('files', 5, {
    fileFilter: portfolioFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload skilled professional portfolio items',
    description: 'Upload up to 5 portfolio items for skilled professional profile (max 5MB each)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { 
          type: 'array', 
          items: { type: 'string', format: 'binary' },
          description: 'Portfolio items (images or documents)'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skilled professional portfolio items uploaded successfully'
  })
  async uploadSkilledProfessionalPortfolio(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const response = await this.mediaService.uploadSkilledProfessionalPortfolioItems(files, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/skilled-professional')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get all skilled professional portfolio items',
    description: 'Get all portfolio items for skilled professional profile'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio items retrieved successfully'
  })
  async getAllSkilledProfessionalPortfolio(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const response = await this.mediaService.getSkilledProfessionalPortfolioItems(req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/skilled-professional/:itemUrl')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get a specific skilled professional portfolio item',
    description: 'Get a specific portfolio item from skilled professional profile'
  })
  @ApiParam({ 
    name: 'itemUrl', 
    description: 'URL of the item to retrieve (URL encoded)',
    example: 'https%3A%2F%2Fcdn.pivota.com%2Fportfolio%2Faccount-123%2Ffile.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item retrieved successfully'
  })
  async getSkilledProfessionalPortfolioItem(
    @Param('itemUrl') itemUrl: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const decodedUrl = decodeURIComponent(itemUrl);
    const response = await this.mediaService.getSkilledProfessionalPortfolioItem(decodedUrl, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('portfolio/skilled-professional/path/:path')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get skilled professional portfolio item by path',
    description: 'Get a specific portfolio item from skilled professional profile using its path'
  })
  @ApiParam({ 
    name: 'path', 
    description: 'Path of the item to retrieve (URL encoded)',
    example: 'portfolio%2Faccount-123%2Ffile.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item retrieved successfully'
  })
  async getSkilledProfessionalPortfolioItemByPath(
    @Param('path') path: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const decodedPath = decodeURIComponent(path);
    const response = await this.mediaService.getSkilledProfessionalPortfolioItemByPath(decodedPath, req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('portfolio/skilled-professional/:itemUrl')
  @Version('1')
  @ApiOperation({ 
    summary: 'Delete skilled professional portfolio item',
    description: 'Delete a specific portfolio item from skilled professional profile'
  })
  @ApiParam({ 
    name: 'itemUrl', 
    description: 'URL of the item to delete (URL encoded)',
    example: 'https%3A%2F%2Fcdn.pivota.com%2Fportfolio%2Faccount-123%2Ffile.jpg'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item deleted successfully'
  })
  async deleteSkilledProfessionalPortfolioItem(
    @Param('itemUrl') itemUrl: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const decodedUrl = decodeURIComponent(itemUrl);
    const response = await this.mediaService.deleteSkilledProfessionalPortfolioItem(decodedUrl, req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('portfolio/skilled-professional/bulk')
  @Version('1')
  @ApiOperation({ 
    summary: 'Bulk delete skilled professional portfolio items',
    description: 'Delete multiple portfolio items from skilled professional profile'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['itemUrls'],
      properties: {
        itemUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of item URLs to delete'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio items deleted successfully'
  })
  async bulkDeleteSkilledProfessionalPortfolioItems(
    @Body() data: { itemUrls: string[] },
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const response = await this.mediaService.bulkDeleteSkilledProfessionalPortfolioItems(data.itemUrls, req);
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
    summary: 'Get all certifications',
    description: 'Get all certification documents for skilled professional profile'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certifications retrieved successfully'
  })
  async getAllCertifications(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<CertificationResponseDto>> {
    const response = await this.mediaService.getCertifications(req);
    if (!response.success) throw response;
    return response;
  }

  @Get('certifications/path/:path')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get certification by path',
    description: 'Get a fresh signed URL for a certification using its stored path'
  })
  @ApiParam({ 
    name: 'path', 
    description: 'Stored path of the certification (URL encoded)',
    example: 'certifications%2Ff8d274ab-7720-4be1-9496-66b0db727193%2Ffile.pdf'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification retrieved successfully'
  })
  async getCertificationByPath(
    @Param('path') path: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<{ url: string; path: string; fileName: string }>> {
    const decodedPath = decodeURIComponent(path);
    const response = await this.mediaService.getCertificationByPath(decodedPath, req);
    if (!response.success) throw response;
    return response;
  }

  @Get('certifications/download/:path')
  @Version('1')
  @ApiOperation({ 
    summary: 'Download certification',
    description: 'Download a specific certification document by its stored path'
  })
  @ApiParam({ 
    name: 'path', 
    description: 'Stored path of the certification to download (URL encoded)',
    example: 'certifications%2Ff8d274ab-7720-4be1-9496-66b0db727193%2Ffile.pdf'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification downloaded successfully'
  })
  async downloadCertificationByPath(
    @Param('path') path: string,
    @Req() req: JwtRequest,
    @Res() res: Response
  ): Promise<void> {
    const decodedPath = decodeURIComponent(path);
    const response = await this.mediaService.downloadCertificationByPath(decodedPath, req);
    if (!response.success) throw response;
    
    const { buffer, mimeType, fileName } = response.data;
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Delete('certifications/path/:path')
  @Version('1')
  @ApiOperation({ 
    summary: 'Delete certification by path',
    description: 'Delete a specific certification document using its stored path'
  })
  @ApiParam({ 
    name: 'path', 
    description: 'Stored path of the certification to delete (URL encoded)',
    example: 'certifications%2Ff8d274ab-7720-4be1-9496-66b0db727193%2Ffile.pdf'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification deleted successfully'
  })
  async deleteCertificationByPath(
    @Param('path') path: string,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const decodedPath = decodeURIComponent(path);
    const response = await this.mediaService.deleteCertificationByPath(decodedPath, req);
    if (!response.success) throw response;
    return response;
  }

  @Delete('certifications/bulk')
  @Version('1')
  @ApiOperation({ 
    summary: 'Bulk delete certifications',
    description: 'Delete multiple certification documents'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paths'],
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of certification paths to delete'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certifications deleted successfully'
  })
  async bulkDeleteCertificationsByPaths(
    @Body() data: { paths: string[] },
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const response = await this.mediaService.bulkDeleteCertificationsByPaths(data.paths, req);
    if (!response.success) throw response;
    return response;
  }

  @Post('certifications/bulk-download')
  @Version('1')
  @ApiOperation({ 
    summary: 'Bulk download certifications',
    description: 'Download multiple certification documents as a ZIP file'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paths'],
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of certification paths to download'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certifications downloaded successfully'
  })
  async bulkDownloadCertifications(
    @Body() data: { paths: string[] },
    @Req() req: JwtRequest,
    @Res() res: Response
  ): Promise<void> {
    const response = await this.mediaService.bulkDownloadCertifications(data.paths, req);
    if (!response.success) throw response;
    
    const { buffer, fileName } = response.data;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }



  // ===========================================================
// JOB SEEKER PORTFOLIO - BULK DOWNLOAD
// ===========================================================

@Post('portfolio/job-seeker/bulk-download')
@Version('1')
@ApiOperation({ 
  summary: 'Bulk download job seeker portfolio items',
  description: 'Download multiple portfolio items as a ZIP file'
})
@ApiBody({
  schema: {
    type: 'object',
    required: ['itemUrls'],
    properties: {
      itemUrls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of item URLs to download'
      }
    }
  }
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Portfolio items downloaded successfully'
})
async bulkDownloadJobSeekerPortfolioItems(
  @Body() data: { itemUrls: string[] },
  @Req() req: JwtRequest,
  @Res() res: Response
): Promise<void> {
  const response = await this.mediaService.bulkDownloadJobSeekerPortfolioItems(data.itemUrls, req);
  if (!response.success) throw response;
  
  const { buffer, fileName } = response.data;
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
}

// ===========================================================
// SKILLED PROFESSIONAL PORTFOLIO - BULK DOWNLOAD
// ===========================================================

@Post('portfolio/skilled-professional/bulk-download')
@Version('1')
@ApiOperation({ 
  summary: 'Bulk download skilled professional portfolio items',
  description: 'Download multiple portfolio items as a ZIP file'
})
@ApiBody({
  schema: {
    type: 'object',
    required: ['itemUrls'],
    properties: {
      itemUrls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of item URLs to download'
      }
    }
  }
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Portfolio items downloaded successfully'
})
async bulkDownloadSkilledProfessionalPortfolioItems(
  @Body() data: { itemUrls: string[] },
  @Req() req: JwtRequest,
  @Res() res: Response
): Promise<void> {
  const response = await this.mediaService.bulkDownloadSkilledProfessionalPortfolioItems(data.itemUrls, req);
  if (!response.success) throw response;
  
  const { buffer, fileName } = response.data;
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
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