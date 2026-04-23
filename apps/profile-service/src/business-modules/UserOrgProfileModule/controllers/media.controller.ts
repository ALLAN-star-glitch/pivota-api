/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/profile-service/src/modules/controllers/media.controller.ts

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload, RpcException } from '@nestjs/microservices';
import { MediaService } from '../services/media.service';
import { 
  BaseResponseDto, 
  BulkDeleteResultDto, 
  CertificationResponseDto, 
  FileDownloadResponseDto, 
  MediaUploadMultipleResponseDto, 
  MediaUploadResponseDto, 
  PortfolioResponseDto,
  PortfolioItemDto,
  ZipDownloadResponseDto,
} from '@pivota-api/dtos';

// Define the gRPC request interfaces
interface UploadProfilePictureRequest {
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  userUuid: string;
  accountUuid: string;
}

interface UploadLogoRequest {
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  userUuid: string;
  accountUuid: string;
}

interface UploadCoverPhotoRequest {
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  userUuid: string;
  accountUuid: string;
}

interface UploadCVRequest {
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  accountUuid: string;
}

interface UploadPortfolioRequest {
  files: Array<{
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }>;
  accountUuid: string;
}

interface GetCVRequest {
  accountUuid: string;
}

interface DownloadCVRequest {
  accountUuid: string;
}

interface GetPortfolioRequest {
  accountUuid: string;
}

interface GetPortfolioItemRequest {
  imageUrl: string;
  accountUuid: string;
}

interface GetPortfolioItemByPathRequest {
  path: string;
  accountUuid: string;
}

interface DeletePortfolioItemRequest {
  imageUrl: string;
  accountUuid: string;
}

interface BulkDeletePortfolioRequest {
  imageUrls: string[];
  accountUuid: string;
}

interface BulkDownloadPortfolioRequest {
  itemUrls: string[];
  accountUuid: string;
}

interface GetCertificationsRequest {
  accountUuid: string;
}

interface GetCertificationByPathRequest {
  path: string;
  accountUuid: string;
}

interface DownloadCertificationRequest {
  path: string;
  accountUuid: string;
}

interface DeleteCertificationRequest {
  certPath: string;
  accountUuid: string;
}

interface BulkDeleteCertificationsRequest {
  certPaths: string[];
  accountUuid: string;
}

interface BulkDownloadCertificationsRequest {
  paths: string[];
  accountUuid: string;
}

interface DeleteFileRequest {
  url: string;
  bucketName: string;
}

// Helper function to convert uploaded file to Express.Multer.File format
function toMulterFile(file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: file.originalname,
    encoding: '7bit',
    mimetype: file.mimetype,
    buffer: file.buffer,
    size: file.size,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };
}

@Controller()
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  // ===========================================================
  // PROFILE PICTURE
  // ===========================================================

  @GrpcMethod('ProfileService', 'UploadProfilePicture')
  async uploadProfilePicture(
    @Payload() request: UploadProfilePictureRequest,
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    this.logger.log(`[gRPC] Uploading profile picture for user: ${request.userUuid}`);
    
    try {
      const file = toMulterFile(request.file);
      return await this.mediaService.uploadProfilePicture(
        file,
        request.userUuid,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error uploading profile picture: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  // ===========================================================
  // LOGO
  // ===========================================================

  @GrpcMethod('ProfileService', 'UploadLogo')
  async uploadLogo(
    @Payload() request: UploadLogoRequest,
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    this.logger.log(`[gRPC] Uploading logo for user: ${request.userUuid}`);
    
    try {
      const file = toMulterFile(request.file);
      return await this.mediaService.uploadLogo(
        file,
        request.userUuid,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error uploading logo: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  // ===========================================================
  // COVER PHOTO
  // ===========================================================

  @GrpcMethod('ProfileService', 'UploadCoverPhoto')
  async uploadCoverPhoto(
    @Payload() request: UploadCoverPhotoRequest,
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    this.logger.log(`[gRPC] Uploading cover photo for user: ${request.userUuid}`);
    
    try {
      const file = toMulterFile(request.file);
      return await this.mediaService.uploadCoverPhoto(
        file,
        request.userUuid,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error uploading cover photo: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  // ===========================================================
  // CV / RESUME
  // ===========================================================

  @GrpcMethod('ProfileService', 'UploadCV')
  async uploadCV(
    @Payload() request: UploadCVRequest,
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    this.logger.log(`[gRPC] Uploading CV for account: ${request.accountUuid}`);
    
    try {
      const file = toMulterFile(request.file);
      return await this.mediaService.uploadCV(file, request.accountUuid);
    } catch (error) {
      this.logger.error(`Error uploading CV: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetCV')
  async getCV(
    @Payload() request: GetCVRequest,
  ): Promise<BaseResponseDto<{ url: string; fileName: string; path: string }>> {
    this.logger.log(`[gRPC] Getting CV for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getCV(request.accountUuid);
    } catch (error) {
      this.logger.error(`Error getting CV: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'DownloadCV')
  async downloadCV(
    @Payload() request: DownloadCVRequest,
  ): Promise<BaseResponseDto<FileDownloadResponseDto>> {
    this.logger.log(`[gRPC] Downloading CV for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.downloadCV(request.accountUuid);
    } catch (error) {
      this.logger.error(`Error downloading CV: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  // ===========================================================
  // JOB SEEKER PORTFOLIO
  // ===========================================================

  @GrpcMethod('ProfileService', 'UploadJobSeekerPortfolioItems')
  async uploadJobSeekerPortfolioItems(
    @Payload() request: UploadPortfolioRequest,
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    this.logger.log(`[gRPC] Uploading ${request.files?.length || 0} job seeker portfolio items for account: ${request.accountUuid}`);
    
    try {
      const files = request.files?.map(f => toMulterFile(f)) || [];
      return await this.mediaService.uploadJobSeekerPortfolioItems(files, request.accountUuid);
    } catch (error) {
      this.logger.error(`Error uploading job seeker portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetJobSeekerPortfolioItems')
  async getJobSeekerPortfolioItems(
    @Payload() request: GetPortfolioRequest,
  ): Promise<BaseResponseDto<PortfolioResponseDto>> {
    this.logger.log(`[gRPC] Getting job seeker portfolio items for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getJobSeekerPortfolioItems(request.accountUuid);
    } catch (error) {
      this.logger.error(`Error getting job seeker portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetJobSeekerPortfolioItem')
  async getJobSeekerPortfolioItem(
    @Payload() request: GetPortfolioItemRequest,
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    this.logger.log(`[gRPC] Getting job seeker portfolio item for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getJobSeekerPortfolioItem(
        request.imageUrl,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error getting job seeker portfolio item: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetJobSeekerPortfolioItemByPath')
  async getJobSeekerPortfolioItemByPath(
    @Payload() request: GetPortfolioItemByPathRequest,
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    this.logger.log(`[gRPC] Getting job seeker portfolio item by path for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getJobSeekerPortfolioItemByPath(
        request.path,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error getting job seeker portfolio item by path: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'DeleteJobSeekerPortfolioItem')
  async deleteJobSeekerPortfolioItem(
    @Payload() request: DeletePortfolioItemRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`[gRPC] Deleting job seeker portfolio item for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.deleteJobSeekerPortfolioItem(
        request.imageUrl,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error deleting job seeker portfolio item: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'BulkDeleteJobSeekerPortfolioItems')
  async bulkDeleteJobSeekerPortfolioItems(
    @Payload() request: BulkDeletePortfolioRequest,
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    this.logger.log(`[gRPC] Bulk deleting ${request.imageUrls?.length || 0} job seeker portfolio items for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.bulkDeleteJobSeekerPortfolioItems(
        request.imageUrls,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error bulk deleting job seeker portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'BulkDownloadJobSeekerPortfolioItems')
  async bulkDownloadJobSeekerPortfolioItems(
    @Payload() request: BulkDownloadPortfolioRequest,
  ): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
    this.logger.log(`[gRPC] Bulk downloading ${request.itemUrls?.length || 0} job seeker portfolio items for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.bulkDownloadJobSeekerPortfolioItems(
        request.itemUrls,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error bulk downloading job seeker portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  // ===========================================================
  // SKILLED PROFESSIONAL PORTFOLIO
  // ===========================================================

  @GrpcMethod('ProfileService', 'UploadSkilledProfessionalPortfolioItems')
  async uploadSkilledProfessionalPortfolioItems(
    @Payload() request: UploadPortfolioRequest,
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    this.logger.log(`[gRPC] Uploading ${request.files?.length || 0} skilled professional portfolio items for account: ${request.accountUuid}`);
    
    try {
      const files = request.files?.map(f => toMulterFile(f)) || [];
      return await this.mediaService.uploadSkilledProfessionalPortfolioItems(files, request.accountUuid);
    } catch (error) {
      this.logger.error(`Error uploading skilled professional portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetSkilledProfessionalPortfolioItems')
  async getSkilledProfessionalPortfolioItems(
    @Payload() request: GetPortfolioRequest,
  ): Promise<BaseResponseDto<PortfolioResponseDto>> {
    this.logger.log(`[gRPC] Getting skilled professional portfolio items for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getSkilledProfessionalPortfolioItems(request.accountUuid);
    } catch (error) {
      this.logger.error(`Error getting skilled professional portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetSkilledProfessionalPortfolioItem')
  async getSkilledProfessionalPortfolioItem(
    @Payload() request: GetPortfolioItemRequest,
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    this.logger.log(`[gRPC] Getting skilled professional portfolio item for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getSkilledProfessionalPortfolioItem(
        request.imageUrl,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error getting skilled professional portfolio item: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetSkilledProfessionalPortfolioItemByPath')
  async getSkilledProfessionalPortfolioItemByPath(
    @Payload() request: GetPortfolioItemByPathRequest,
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    this.logger.log(`[gRPC] Getting skilled professional portfolio item by path for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getSkilledProfessionalPortfolioItemByPath(
        request.path,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error getting skilled professional portfolio item by path: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'DeleteSkilledProfessionalPortfolioItem')
  async deleteSkilledProfessionalPortfolioItem(
    @Payload() request: DeletePortfolioItemRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`[gRPC] Deleting skilled professional portfolio item for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.deleteSkilledProfessionalPortfolioItem(
        request.imageUrl,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error deleting skilled professional portfolio item: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'BulkDeleteSkilledProfessionalPortfolioItems')
  async bulkDeleteSkilledProfessionalPortfolioItems(
    @Payload() request: BulkDeletePortfolioRequest,
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    this.logger.log(`[gRPC] Bulk deleting ${request.imageUrls?.length || 0} skilled professional portfolio items for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.bulkDeleteSkilledProfessionalPortfolioItems(
        request.imageUrls,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error bulk deleting skilled professional portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'BulkDownloadSkilledProfessionalPortfolioItems')
  async bulkDownloadSkilledProfessionalPortfolioItems(
    @Payload() request: BulkDownloadPortfolioRequest,
  ): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
    this.logger.log(`[gRPC] Bulk downloading ${request.itemUrls?.length || 0} skilled professional portfolio items for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.bulkDownloadSkilledProfessionalPortfolioItems(
        request.itemUrls,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error bulk downloading skilled professional portfolio: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  // ===========================================================
  // CERTIFICATIONS
  // ===========================================================

  @GrpcMethod('ProfileService', 'UploadCertifications')
  async uploadCertifications(
    @Payload() request: UploadPortfolioRequest,
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    this.logger.log(`[gRPC] Uploading ${request.files?.length || 0} certifications for account: ${request.accountUuid}`);
    
    try {
      const files = request.files?.map(f => toMulterFile(f)) || [];
      return await this.mediaService.uploadCertifications(files, request.accountUuid);
    } catch (error) {
      this.logger.error(`Error uploading certifications: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetCertifications')
  async getCertifications(
    @Payload() request: GetCertificationsRequest,
  ): Promise<BaseResponseDto<CertificationResponseDto>> {
    this.logger.log(`[gRPC] Getting certifications for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getCertifications(request.accountUuid);
    } catch (error) {
      this.logger.error(`Error getting certifications: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'GetCertificationByPath')
  async getCertificationByPath(
    @Payload() request: GetCertificationByPathRequest,
  ): Promise<BaseResponseDto<{ url: string; path: string; fileName: string }>> {
    this.logger.log(`[gRPC] Getting certification by path for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.getCertificationByPath(
        request.path,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error getting certification by path: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'DownloadCertificationByPath')
  async downloadCertificationByPath(
    @Payload() request: DownloadCertificationRequest,
  ): Promise<BaseResponseDto<FileDownloadResponseDto>> {
    this.logger.log(`[gRPC] Downloading certification by path for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.downloadCertificationByPath(
        request.path,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error downloading certification by path: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'DeleteCertification')
  async deleteCertification(
    @Payload() request: DeleteCertificationRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`[gRPC] Deleting certification for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.deleteCertification(
        request.certPath,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error deleting certification: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'BulkDeleteCertifications')
  async bulkDeleteCertifications(
    @Payload() request: BulkDeleteCertificationsRequest,
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    this.logger.log(`[gRPC] Bulk deleting ${request.certPaths?.length || 0} certifications for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.bulkDeleteCertifications(
        request.certPaths,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error bulk deleting certifications: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  @GrpcMethod('ProfileService', 'BulkDownloadCertifications')
  async bulkDownloadCertifications(
    @Payload() request: BulkDownloadCertificationsRequest,
  ): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
    this.logger.log(`[gRPC] Bulk downloading ${request.paths?.length || 0} certifications for account: ${request.accountUuid}`);
    
    try {
      return await this.mediaService.bulkDownloadCertifications(
        request.paths,
        request.accountUuid,
      );
    } catch (error) {
      this.logger.error(`Error bulk downloading certifications: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }

  // ===========================================================
  // GENERIC FILE DELETE
  // ===========================================================

  @GrpcMethod('ProfileService', 'DeleteFile')
  async deleteFile(
    @Payload() request: DeleteFileRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`[gRPC] Deleting file: ${request.url}`);
    
    try {
      return await this.mediaService.deleteFile(request.url, request.bucketName);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new RpcException({
        code: 13,
        message: error.message,
      });
    }
  }
}