// apps/gateway/src/modules/profile/media.service.ts

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  BulkDeleteResultDto,
  CertificationResponseDto,
  FileDownloadResponseDto,
  MediaUploadMultipleResponseDto,
  MediaUploadResponseDto,
  PortfolioItemDto,
  PortfolioResponseDto,
  ZipDownloadResponseDto,
} from '@pivota-api/dtos';
import { JwtRequest } from '@pivota-api/interfaces';

// ======================================================
// gRPC Client Interface - ALL methods return Observable
// ======================================================

interface ProfileServiceGrpc {
  // Profile Picture
  uploadProfilePicture(data: {
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    userUuid: string;
    accountUuid: string;
  }): Observable<BaseResponseDto<MediaUploadResponseDto>>;
  
  uploadLogo(data: {
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    userUuid: string;
    accountUuid: string;
  }): Observable<BaseResponseDto<MediaUploadResponseDto>>;
  
  uploadCoverPhoto(data: {
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    userUuid: string;
    accountUuid: string;
  }): Observable<BaseResponseDto<MediaUploadResponseDto>>;
  
  // CV
  uploadCV(data: {
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    accountUuid: string;
  }): Observable<BaseResponseDto<MediaUploadResponseDto>>;
  
  getCV(data: { accountUuid: string }): Observable<BaseResponseDto<{ url: string; fileName: string; path: string }>>;
  downloadCV(data: { accountUuid: string }): Observable<BaseResponseDto<FileDownloadResponseDto>>;
  
  // Job Seeker Portfolio
  uploadJobSeekerPortfolioItems(data: {
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string; size: number }>;
    accountUuid: string;
  }): Observable<BaseResponseDto<MediaUploadMultipleResponseDto>>;
  
  getJobSeekerPortfolioItems(data: { accountUuid: string }): Observable<BaseResponseDto<PortfolioResponseDto>>;
  getJobSeekerPortfolioItem(data: { imageUrl: string; accountUuid: string }): Observable<BaseResponseDto<PortfolioItemDto>>;
  getJobSeekerPortfolioItemByPath(data: { path: string; accountUuid: string }): Observable<BaseResponseDto<PortfolioItemDto>>;
  deleteJobSeekerPortfolioItem(data: { imageUrl: string; accountUuid: string }): Observable<BaseResponseDto<null>>;
  bulkDeleteJobSeekerPortfolioItems(data: { imageUrls: string[]; accountUuid: string }): Observable<BaseResponseDto<BulkDeleteResultDto>>;
  bulkDownloadJobSeekerPortfolioItems(data: { itemUrls: string[]; accountUuid: string }): Observable<BaseResponseDto<ZipDownloadResponseDto>>;
  
  // Skilled Professional Portfolio
  uploadSkilledProfessionalPortfolioItems(data: {
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string; size: number }>;
    accountUuid: string;
  }): Observable<BaseResponseDto<MediaUploadMultipleResponseDto>>;
  
  getSkilledProfessionalPortfolioItems(data: { accountUuid: string }): Observable<BaseResponseDto<PortfolioResponseDto>>;
  getSkilledProfessionalPortfolioItem(data: { imageUrl: string; accountUuid: string }): Observable<BaseResponseDto<PortfolioItemDto>>;
  getSkilledProfessionalPortfolioItemByPath(data: { path: string; accountUuid: string }): Observable<BaseResponseDto<PortfolioItemDto>>;
  deleteSkilledProfessionalPortfolioItem(data: { imageUrl: string; accountUuid: string }): Observable<BaseResponseDto<null>>;
  bulkDeleteSkilledProfessionalPortfolioItems(data: { imageUrls: string[]; accountUuid: string }): Observable<BaseResponseDto<BulkDeleteResultDto>>;
  bulkDownloadSkilledProfessionalPortfolioItems(data: { itemUrls: string[]; accountUuid: string }): Observable<BaseResponseDto<ZipDownloadResponseDto>>;
  
  // Certifications
  uploadCertifications(data: {
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string; size: number }>;
    accountUuid: string;
  }): Observable<BaseResponseDto<MediaUploadMultipleResponseDto>>;
  
  getCertifications(data: { accountUuid: string }): Observable<BaseResponseDto<CertificationResponseDto>>;
  getCertificationByPath(data: { path: string; accountUuid: string }): Observable<BaseResponseDto<{ url: string; path: string; fileName: string }>>;
  downloadCertificationByPath(data: { path: string; accountUuid: string }): Observable<BaseResponseDto<FileDownloadResponseDto>>;
  deleteCertification(data: { certPath: string; accountUuid: string }): Observable<BaseResponseDto<null>>;
  bulkDeleteCertifications(data: { certPaths: string[]; accountUuid: string }): Observable<BaseResponseDto<BulkDeleteResultDto>>;
  bulkDownloadCertifications(data: { paths: string[]; accountUuid: string }): Observable<BaseResponseDto<ZipDownloadResponseDto>>;
  
  // Generic
  deleteFile(data: { url: string; bucketName: string }): Observable<BaseResponseDto<null>>;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private profileGrpc: ProfileServiceGrpc;

  constructor(
    @Inject('PROFILE_PACKAGE') private readonly grpcClient: ClientGrpc,
  ) {
    this.profileGrpc = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  // ===========================================================
  // PROFILE PICTURE
  // ===========================================================

  async uploadProfilePicture(
    file: Express.Multer.File,
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const userUuid = req.user.sub;
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.uploadProfilePicture({
        file: {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        userUuid,
        accountUuid,
      })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async uploadLogo(
    file: Express.Multer.File,
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const userUuid = req.user.sub;
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.uploadLogo({
        file: {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        userUuid,
        accountUuid,
      })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async uploadCoverPhoto(
    file: Express.Multer.File,
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const userUuid = req.user.sub;
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.uploadCoverPhoto({
        file: {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        userUuid,
        accountUuid,
      })
    );
    
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // CV / RESUME
  // ===========================================================

  async uploadCV(
    file: Express.Multer.File,
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.uploadCV({
        file: {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        accountUuid,
      })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getCV(req: JwtRequest): Promise<BaseResponseDto<{ url: string; fileName: string; path: string }>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getCV({ accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async downloadCV(req: JwtRequest): Promise<BaseResponseDto<FileDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.downloadCV({ accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // JOB SEEKER PORTFOLIO
  // ===========================================================

  async uploadJobSeekerPortfolioItems(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.uploadJobSeekerPortfolioItems({
        files: files.map(file => ({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        })),
        accountUuid,
      })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getJobSeekerPortfolioItems(req: JwtRequest): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getJobSeekerPortfolioItems({ accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getJobSeekerPortfolioItem(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getJobSeekerPortfolioItem({ imageUrl, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getJobSeekerPortfolioItemByPath(
    path: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getJobSeekerPortfolioItemByPath({ path, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async deleteJobSeekerPortfolioItem(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.deleteJobSeekerPortfolioItem({ imageUrl, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async bulkDeleteJobSeekerPortfolioItems(
    itemUrls: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.bulkDeleteJobSeekerPortfolioItems({ imageUrls: itemUrls, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async bulkDownloadJobSeekerPortfolioItems(
    itemUrls: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.bulkDownloadJobSeekerPortfolioItems({ itemUrls, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // SKILLED PROFESSIONAL PORTFOLIO
  // ===========================================================

  async uploadSkilledProfessionalPortfolioItems(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.uploadSkilledProfessionalPortfolioItems({
        files: files.map(file => ({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        })),
        accountUuid,
      })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getSkilledProfessionalPortfolioItems(req: JwtRequest): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getSkilledProfessionalPortfolioItems({ accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getSkilledProfessionalPortfolioItem(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getSkilledProfessionalPortfolioItem({ imageUrl, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getSkilledProfessionalPortfolioItemByPath(
    path: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getSkilledProfessionalPortfolioItemByPath({ path, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async deleteSkilledProfessionalPortfolioItem(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.deleteSkilledProfessionalPortfolioItem({ imageUrl, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async bulkDeleteSkilledProfessionalPortfolioItems(
    itemUrls: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.bulkDeleteSkilledProfessionalPortfolioItems({ imageUrls: itemUrls, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async bulkDownloadSkilledProfessionalPortfolioItems(
    itemUrls: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.bulkDownloadSkilledProfessionalPortfolioItems({ itemUrls, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // CERTIFICATIONS
  // ===========================================================

  async uploadCertifications(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.uploadCertifications({
        files: files.map(file => ({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        })),
        accountUuid,
      })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getCertifications(req: JwtRequest): Promise<BaseResponseDto<CertificationResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getCertifications({ accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async getCertificationByPath(
    path: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<{ url: string; path: string; fileName: string }>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.getCertificationByPath({ path, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async downloadCertificationByPath(
    path: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<FileDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.downloadCertificationByPath({ path, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async deleteCertificationByPath(
    path: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.deleteCertification({ certPath: path, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async bulkDeleteCertificationsByPaths(
    paths: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.bulkDeleteCertifications({ certPaths: paths, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  async bulkDownloadCertifications(
    paths: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const response = await firstValueFrom(
      this.profileGrpc.bulkDownloadCertifications({ paths, accountUuid })
    );
    
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // GENERIC FILE DELETE
  // ===========================================================

  async deleteFile(
    url: string,
    bucketName: string,
  ): Promise<BaseResponseDto<null>> {
    const response = await firstValueFrom(
      this.profileGrpc.deleteFile({ url, bucketName })
    );
    
    if (!response.success) throw response;
    return response;
  }
}