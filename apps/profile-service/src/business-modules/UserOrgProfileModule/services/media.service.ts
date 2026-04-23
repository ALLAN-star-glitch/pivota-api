import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '@pivota-api/shared-storage';
import { 
  BaseResponseDto,
  BulkDeleteResultDto,
  CertificationItemDto,
  CertificationResponseDto,
  FileDownloadResponseDto,
  MediaUploadMultipleResponseDto,
  MediaUploadResponseDto,
  PortfolioItemDto,
  PortfolioResponseDto,
  UpdateFullUserProfileDto, 
  UpdateJobSeekerGrpcRequestDto,
  UpdateSkilledProfessionalGrpcRequestDto,
  ZipDownloadResponseDto,
} from '@pivota-api/dtos';
import { UserService } from './user.service';

interface StoredPortfolioItem {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  order: number;
}

interface StoredCertificationItem {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// ======================================================
// SERVICE
// ======================================================

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly MAX_PORTFOLIO_ITEMS = 5;

  // Cache for metadata (consider moving to Redis in production)
  private jobSeekerPortfolioMetadata: Map<string, StoredPortfolioItem[]> = new Map();
  private skilledProfessionalPortfolioMetadata: Map<string, StoredPortfolioItem[]> = new Map();
  private certificationMetadata: Map<string, StoredCertificationItem[]> = new Map();

  constructor(
    private userService: UserService,
    private readonly storage: StorageService,
  ) {}

  private async uploadFile(
    file: Express.Multer.File,
    folder: string,
    bucketName: string,
  ): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string }> {
    const url = await this.storage.uploadFile(file, folder, bucketName);
    return {
      url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  private validatePortfolioLimit(currentCount: number, newCount: number): void {
    const total = currentCount + newCount;
    if (total > this.MAX_PORTFOLIO_ITEMS) {
      throw BaseResponseDto.fail(
        `Maximum ${this.MAX_PORTFOLIO_ITEMS} portfolio items allowed. You have ${currentCount} already.`,
        'LIMIT_EXCEEDED'
      );
    }
  }

  private extractFileNameFromUrl(url: string): string {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    return parts[parts.length - 1];
  }

  private getMimeTypeFromUrl(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }

  // ===========================================================
  // PROFILE PICTURE
  // ===========================================================

  async uploadProfilePicture(
    file: Express.Multer.File,
    userUuid: string,
    accountUuid: string
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    // Get old profile image URL
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const oldProfileImage = accountResponse?.data?.individualProfile?.profileImage;
    
    const { url, fileName, fileSize, mimeType } = await this.uploadFile(
      file, 
      `profiles/${userUuid}`, 
      'pivota-public'
    );
    
    const dto: UpdateFullUserProfileDto = {
      userUuid,
      profileImage: url
    };
    
    await this.userService.updateProfile(dto);
    
    // Delete old file if it exists and is different
    if (oldProfileImage && oldProfileImage !== url) {
      await this.storage.deleteFiles([oldProfileImage], 'pivota-public').catch(err => {
        this.logger.warn(`Failed to delete old profile image: ${oldProfileImage}`, err);
      });
    }
    
    const data: MediaUploadResponseDto = {
      message: 'Profile picture uploaded successfully',
      url,
      fileName,
      fileSize,
      mimeType,
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // LOGO
  // ===========================================================

  async uploadLogo(
    file: Express.Multer.File,
    userUuid: string,
    accountUuid: string
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    // Get old logo URL before updating
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const oldLogo = accountResponse?.data?.individualProfile?.logo;
    
    const { url, fileName, fileSize, mimeType } = await this.uploadFile(
      file, 
      `logos/${accountUuid}`, 
      'pivota-public'
    );
    
    const dto: UpdateFullUserProfileDto = {
      userUuid,
      logo: url
    };
    
    await this.userService.updateProfile(dto);
    
    // Delete old logo if it exists and is different
    if (oldLogo && oldLogo !== url) {
      await this.storage.deleteFiles([oldLogo], 'pivota-public').catch(err => {
        this.logger.warn(`Failed to delete old logo: ${oldLogo}`, err);
      });
    }
    
    const data: MediaUploadResponseDto = {
      message: 'Logo uploaded successfully',
      url,
      fileName,
      fileSize,
      mimeType,
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // COVER PHOTO
  // ===========================================================

  async uploadCoverPhoto(
    file: Express.Multer.File,
    userUuid: string,
    accountUuid: string
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    // Get old cover photo URL before updating
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const oldCoverPhoto = accountResponse?.data?.individualProfile?.coverPhoto;
    
    const { url, fileName, fileSize, mimeType } = await this.uploadFile(
      file, 
      `covers/${userUuid}`, 
      'pivota-public'
    );
    
    const dto: UpdateFullUserProfileDto = {
      userUuid,
      coverPhoto: url
    };
    
    await this.userService.updateProfile(dto);
    
    // Delete old cover photo if it exists and is different
    if (oldCoverPhoto && oldCoverPhoto !== url) {
      await this.storage.deleteFiles([oldCoverPhoto], 'pivota-public').catch(err => {
        this.logger.warn(`Failed to delete old cover photo: ${oldCoverPhoto}`, err);
      });
    }
    
    const data: MediaUploadResponseDto = {
      message: 'Cover photo uploaded successfully',
      url,
      fileName,
      fileSize,
      mimeType,
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // CV / RESUME
  // ===========================================================

  async uploadCV(
    file: Express.Multer.File,
    accountUuid: string
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const { url, fileName, fileSize, mimeType } = await this.uploadFile(
      file, 
      `cvs/${accountUuid}`, 
      'pivota-private'
    );
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      cvUrl: url
    };
    
    await this.userService.updateJobSeekerProfile(dto);
    
    const data: MediaUploadResponseDto = {
      message: 'CV uploaded successfully',
      url,
      fileName,
      fileSize,
      mimeType,
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // GET CV
  // ===========================================================

  async getCV(accountUuid: string): Promise<BaseResponseDto<{ url: string; fileName: string; path: string }>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const cvPath = accountResponse?.data?.jobSeekerProfile?.cvUrl;
    
    if (!cvPath) {
      return BaseResponseDto.fail('CV not found', 'NOT_FOUND');
    }
    
    const signedUrl = await this.storage.getPrivateUrl(cvPath, 3600);
    
    return BaseResponseDto.ok(
      { 
        url: signedUrl, 
        fileName: this.extractFileNameFromUrl(cvPath),
        path: cvPath 
      },
      'CV retrieved successfully',
      'OK'
    );
  }

  // ===========================================================
  // DOWNLOAD CV
  // ===========================================================

  async downloadCV(accountUuid: string): Promise<BaseResponseDto<FileDownloadResponseDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const cvPath = accountResponse?.data?.jobSeekerProfile?.cvUrl;
    
    if (!cvPath) {
      return BaseResponseDto.fail('CV not found', 'NOT_FOUND');
    }
    
    const { data, mimeType, fileName } = await this.storage.downloadFile(cvPath, 'pivota-private');
    
    const result: FileDownloadResponseDto = {
      buffer: data,
      mimeType: mimeType,
      fileName: fileName,
    };
    
    return BaseResponseDto.ok(result, 'CV downloaded successfully', 'OK');
  }

  // ===========================================================
  // JOB SEEKER PORTFOLIO
  // ===========================================================

  async uploadJobSeekerPortfolioItems(
    files: Express.Multer.File[],
    accountUuid: string
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
    
    this.validatePortfolioLimit(existingUrls.length, files.length);
    
    const newItems: MediaUploadResponseDto[] = [];
    const newUrls: string[] = [];
    
    for (const file of files) {
      const { url, fileName, fileSize, mimeType } = await this.uploadFile(
        file, 
        `portfolio/${accountUuid}`, 
        'pivota-public'
      );
      newUrls.push(url);
      newItems.push({
        message: 'Portfolio item uploaded successfully',
        url,
        fileName,
        fileSize,
        mimeType,
      });
    }
    
    const allUrls = [...existingUrls, ...newUrls];
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      portfolioImages: allUrls
    };
    
    await this.userService.updateJobSeekerProfile(dto);
    
    // Update cache
    const allItems: StoredPortfolioItem[] = allUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.jobSeekerPortfolioMetadata.set(accountUuid, allItems);
    
    const data: MediaUploadMultipleResponseDto = {
      message: `Successfully uploaded ${newItems.length} portfolio item(s)`,
      items: newItems
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  async getJobSeekerPortfolioItems(accountUuid: string): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const portfolioUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
    
    const items: PortfolioItemDto[] = portfolioUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    
    const data: PortfolioResponseDto = {
      items,
      total: items.length,
    };
    
    return BaseResponseDto.ok(data, 'Portfolio items retrieved successfully', 'OK');
  }

  async deleteJobSeekerPortfolioItem(
    imageUrl: string,
    accountUuid: string
  ): Promise<BaseResponseDto<null>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
    
    const updatedUrls = existingUrls.filter(url => url !== imageUrl);
    
    if (updatedUrls.length === existingUrls.length) {
      return BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
    }
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedUrls
    };
    
    await this.userService.updateJobSeekerProfile(dto);
    
    // Update cache
    const updatedItems: StoredPortfolioItem[] = updatedUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.jobSeekerPortfolioMetadata.set(accountUuid, updatedItems);
    
    // Delete from storage (don't await, let it run in background)
    this.storage.deleteFiles([imageUrl], 'pivota-public').catch(err => {
      this.logger.warn(`Failed to delete portfolio item from storage: ${imageUrl}`, err);
    });
    
    return BaseResponseDto.ok(null, 'Portfolio item removed successfully', 'OK');
  }

  async bulkDeleteJobSeekerPortfolioItems(
    imageUrls: string[],
    accountUuid: string
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
    
    const validUrls = imageUrls.filter(url => existingUrls.includes(url));
    const invalidUrls = imageUrls.filter(url => !existingUrls.includes(url));
    
    if (validUrls.length === 0) {
      return BaseResponseDto.fail('No valid items to delete', 'NOT_FOUND');
    }
    
    const updatedUrls = existingUrls.filter(url => !validUrls.includes(url));
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedUrls
    };
    
    await this.userService.updateJobSeekerProfile(dto);
    
    // Update cache
    const updatedItems: StoredPortfolioItem[] = updatedUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.jobSeekerPortfolioMetadata.set(accountUuid, updatedItems);
    
    // Delete from storage in background
    this.storage.deleteFiles(validUrls, 'pivota-public').catch(err => {
      this.logger.error(`Failed to delete portfolio items from storage: ${validUrls.join(', ')}`, err);
    });
    
    const message = invalidUrls.length > 0
      ? `Successfully deleted ${validUrls.length} items. ${invalidUrls.length} items were not found.`
      : `Successfully deleted ${validUrls.length} portfolio items`;
    
    return BaseResponseDto.ok(
      { deletedCount: validUrls.length, failedUrls: invalidUrls },
      message,
      'OK'
    );
  }

  // ===========================================================
  // SKILLED PROFESSIONAL PORTFOLIO
  // ===========================================================

  async uploadSkilledProfessionalPortfolioItems(
    files: Express.Multer.File[],
    accountUuid: string
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    
    this.validatePortfolioLimit(existingUrls.length, files.length);
    
    const newItems: MediaUploadResponseDto[] = [];
    const newUrls: string[] = [];
    
    for (const file of files) {
      const { url, fileName, fileSize, mimeType } = await this.uploadFile(
        file, 
        `portfolio/${accountUuid}`, 
        'pivota-public'
      );
      newUrls.push(url);
      newItems.push({
        message: 'Portfolio item uploaded successfully',
        url,
        fileName,
        fileSize,
        mimeType,
      });
    }
    
    const allUrls = [...existingUrls, ...newUrls];
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      portfolioImages: allUrls
    };
    
    await this.userService.updateSkilledProfessionalProfile(dto);
    
    const allItems: StoredPortfolioItem[] = allUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.skilledProfessionalPortfolioMetadata.set(accountUuid, allItems);
    
    const data: MediaUploadMultipleResponseDto = {
      message: `Successfully uploaded ${newItems.length} portfolio item(s)`,
      items: newItems
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  async getSkilledProfessionalPortfolioItems(accountUuid: string): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const portfolioUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    
    const items: PortfolioItemDto[] = portfolioUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    
    const data: PortfolioResponseDto = {
      items,
      total: items.length,
    };
    
    return BaseResponseDto.ok(data, 'Portfolio items retrieved successfully', 'OK');
  }

  async deleteSkilledProfessionalPortfolioItem(
    imageUrl: string,
    accountUuid: string
  ): Promise<BaseResponseDto<null>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    const updatedUrls = existingUrls.filter(url => url !== imageUrl);
    
    if (updatedUrls.length === existingUrls.length) {
      return BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
    }
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedUrls
    };
    
    await this.userService.updateSkilledProfessionalProfile(dto);
    
    const updatedItems: StoredPortfolioItem[] = updatedUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.skilledProfessionalPortfolioMetadata.set(accountUuid, updatedItems);
    
    this.storage.deleteFiles([imageUrl], 'pivota-public').catch(err => {
      this.logger.warn(`Failed to delete portfolio item from storage: ${imageUrl}`, err);
    });
    
    return BaseResponseDto.ok(null, 'Portfolio item removed successfully', 'OK');
  }

  async bulkDeleteSkilledProfessionalPortfolioItems(
    imageUrls: string[],
    accountUuid: string
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    
    const validUrls = imageUrls.filter(url => existingUrls.includes(url));
    const invalidUrls = imageUrls.filter(url => !existingUrls.includes(url));
    
    if (validUrls.length === 0) {
      return BaseResponseDto.fail('No valid items to delete', 'NOT_FOUND');
    }
    
    const updatedUrls = existingUrls.filter(url => !validUrls.includes(url));
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedUrls
    };
    
    await this.userService.updateSkilledProfessionalProfile(dto);
    
    const updatedItems: StoredPortfolioItem[] = updatedUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.skilledProfessionalPortfolioMetadata.set(accountUuid, updatedItems);
    
    this.storage.deleteFiles(validUrls, 'pivota-public').catch(err => {
      this.logger.error(`Failed to delete portfolio items from storage: ${validUrls.join(', ')}`, err);
    });
    
    const message = invalidUrls.length > 0
      ? `Successfully deleted ${validUrls.length} items. ${invalidUrls.length} items were not found.`
      : `Successfully deleted ${validUrls.length} portfolio items`;
    
    return BaseResponseDto.ok(
      { deletedCount: validUrls.length, failedUrls: invalidUrls },
      message,
      'OK'
    );
  }

  // ===========================================================
  // CERTIFICATIONS
  // ===========================================================

  async uploadCertifications(
    files: Express.Multer.File[],
    accountUuid: string
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const existingItems = this.certificationMetadata.get(accountUuid) || [];
    
    const newItems: MediaUploadResponseDto[] = [];
    const newStoredItems: StoredCertificationItem[] = [];
    
    for (const file of files) {
      const { url, fileName, fileSize, mimeType } = await this.uploadFile(
        file, 
        `certifications/${accountUuid}`, 
        'pivota-private'
      );
      const uploadedAt = new Date().toISOString();
      
      newItems.push({
        message: 'Certification uploaded successfully',
        url,
        fileName,
        fileSize,
        mimeType,
      });
      
      newStoredItems.push({
        url,
        fileName,
        fileSize,
        mimeType,
        uploadedAt,
      });
    }
    
    const allItems = [...existingItems, ...newStoredItems];
    this.certificationMetadata.set(accountUuid, allItems);
    
    const urls = allItems.map(item => item.url);
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      certifications: urls
    };
    
    await this.userService.updateSkilledProfessionalProfile(dto);
    
    const data: MediaUploadMultipleResponseDto = {
      message: `Successfully uploaded ${newItems.length} certification(s)`,
      items: newItems
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  async getCertifications(accountUuid: string): Promise<BaseResponseDto<CertificationResponseDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const certificationPaths = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    const items: CertificationItemDto[] = [];
    for (const path of certificationPaths) {
      const signedUrl = await this.storage.getPrivateUrl(path, 3600);
      items.push({
        url: signedUrl,
        path: path,
        fileName: this.extractFileNameFromUrl(path),
        fileSize: 0,
        mimeType: this.getMimeTypeFromUrl(path),
        uploadedAt: new Date().toISOString(),
      });
    }
    
    const data: CertificationResponseDto = {
      items,
      total: items.length,
    };
    
    return BaseResponseDto.ok(data, 'Certifications retrieved successfully', 'OK');
  }

  async deleteCertification(
    certPath: string,
    accountUuid: string
  ): Promise<BaseResponseDto<null>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingCerts = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    if (!existingCerts.includes(certPath)) {
      return BaseResponseDto.fail('Certification not found', 'NOT_FOUND');
    }
    
    const updatedCerts = existingCerts.filter(path => path !== certPath);
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      certifications: updatedCerts
    };
    
    await this.userService.updateSkilledProfessionalProfile(dto);
    
    // Update cache
    const updatedItems = updatedCerts.map((path) => ({
      url: path,
      fileName: this.extractFileNameFromUrl(path),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(path),
      uploadedAt: new Date().toISOString(),
    }));
    this.certificationMetadata.set(accountUuid, updatedItems);
    
    this.storage.deleteFiles([certPath], 'pivota-private').catch(err => {
      this.logger.warn(`Failed to delete certification from storage: ${certPath}`, err);
    });
    
    return BaseResponseDto.ok(null, 'Certification removed successfully', 'OK');
  }

  async bulkDeleteCertifications(
    certPaths: string[],
    accountUuid: string
  ): Promise<BaseResponseDto<BulkDeleteResultDto>> {
    const accountResponse = await this.userService.getAccountByUuid(accountUuid);
    const existingCerts = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    const validPaths = certPaths.filter(path => existingCerts.includes(path));
    const invalidPaths = certPaths.filter(path => !existingCerts.includes(path));
    
    if (validPaths.length === 0) {
      return BaseResponseDto.fail('No valid certifications to delete', 'NOT_FOUND');
    }
    
    const updatedCerts = existingCerts.filter(path => !validPaths.includes(path));
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      certifications: updatedCerts
    };
    
    await this.userService.updateSkilledProfessionalProfile(dto);
    
    // Update cache
    const updatedItems = updatedCerts.map((path) => ({
      url: path,
      fileName: this.extractFileNameFromUrl(path),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(path),
      uploadedAt: new Date().toISOString(),
    }));
    this.certificationMetadata.set(accountUuid, updatedItems);
    
    this.storage.deleteFiles(validPaths, 'pivota-private').catch(err => {
      this.logger.error(`Failed to delete certifications from storage: ${validPaths.join(', ')}`, err);
    });
    
    const message = invalidPaths.length > 0
      ? `Successfully deleted ${validPaths.length} certifications. ${invalidPaths.length} were not found.`
      : `Successfully deleted ${validPaths.length} certifications`;
    
    return BaseResponseDto.ok(
      { deletedCount: validPaths.length, failedUrls: invalidPaths },
      message,
      'OK'
    );
  }

 // ===========================================================
// JOB SEEKER PORTFOLIO - SINGLE ITEM RETRIEVAL
// ===========================================================

async getJobSeekerPortfolioItem(
  imageUrl: string,
  accountUuid: string
): Promise<BaseResponseDto<PortfolioItemDto>> {
  const items = this.jobSeekerPortfolioMetadata.get(accountUuid) || [];
  const item = items.find(i => i.url === imageUrl);
  
  if (!item) {
    return BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
  }
  
  const data: PortfolioItemDto = {
    url: item.url,
    fileName: item.fileName,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
    uploadedAt: item.uploadedAt,
    order: item.order,
  };
  
  return BaseResponseDto.ok(data, 'Portfolio item retrieved successfully', 'OK');
}

async getJobSeekerPortfolioItemByPath(
  path: string,
  accountUuid: string
): Promise<BaseResponseDto<PortfolioItemDto>> {
  const accountResponse = await this.userService.getAccountByUuid(accountUuid);
  const portfolioUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
  
  // Find the URL that contains the path
  const fullUrl = portfolioUrls.find(url => url.includes(path));
  
  if (!fullUrl) {
    return BaseResponseDto.fail('Portfolio item not found', 'NOT_FOUND');
  }
  
  const items = this.jobSeekerPortfolioMetadata.get(accountUuid) || [];
  const item = items.find(i => i.url === fullUrl);
  
  const data: PortfolioItemDto = {
    url: fullUrl,
    fileName: item?.fileName || this.extractFileNameFromUrl(fullUrl),
    fileSize: item?.fileSize || 0,
    mimeType: item?.mimeType || this.getMimeTypeFromUrl(fullUrl),
    uploadedAt: item?.uploadedAt || new Date().toISOString(),
    order: item?.order || 1,
  };
  
  return BaseResponseDto.ok(data, 'Portfolio item retrieved successfully', 'OK');
}

// ===========================================================
// SKILLED PROFESSIONAL PORTFOLIO - SINGLE ITEM RETRIEVAL
// ===========================================================

async getSkilledProfessionalPortfolioItem(
  imageUrl: string,
  accountUuid: string
): Promise<BaseResponseDto<PortfolioItemDto>> {
  const items = this.skilledProfessionalPortfolioMetadata.get(accountUuid) || [];
  const item = items.find(i => i.url === imageUrl);
  
  if (!item) {
    return BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
  }
  
  const data: PortfolioItemDto = {
    url: item.url,
    fileName: item.fileName,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
    uploadedAt: item.uploadedAt,
    order: item.order,
  };
  
  return BaseResponseDto.ok(data, 'Portfolio item retrieved successfully', 'OK');
}

async getSkilledProfessionalPortfolioItemByPath(
  path: string,
  accountUuid: string
): Promise<BaseResponseDto<PortfolioItemDto>> {
  const accountResponse = await this.userService.getAccountByUuid(accountUuid);
  const portfolioUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
  
  // Find the URL that contains the path
  const fullUrl = portfolioUrls.find(url => url.includes(path));
  
  if (!fullUrl) {
    return BaseResponseDto.fail('Portfolio item not found', 'NOT_FOUND');
  }
  
  const items = this.skilledProfessionalPortfolioMetadata.get(accountUuid) || [];
  const item = items.find(i => i.url === fullUrl);
  
  const data: PortfolioItemDto = {
    url: fullUrl,
    fileName: item?.fileName || this.extractFileNameFromUrl(fullUrl),
    fileSize: item?.fileSize || 0,
    mimeType: item?.mimeType || this.getMimeTypeFromUrl(fullUrl),
    uploadedAt: item?.uploadedAt || new Date().toISOString(),
    order: item?.order || 1,
  };
  
  return BaseResponseDto.ok(data, 'Portfolio item retrieved successfully', 'OK');
}

// ===========================================================
// CERTIFICATIONS - ADDITIONAL METHODS
// ===========================================================

async getCertificationByPath(
  path: string,
  accountUuid: string
): Promise<BaseResponseDto<{ url: string; path: string; fileName: string }>> {
  const accountResponse = await this.userService.getAccountByUuid(accountUuid);
  const certifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
  
  if (!certifications.includes(path)) {
    return BaseResponseDto.fail('Certification not found', 'NOT_FOUND');
  }
  
  const signedUrl = await this.storage.getPrivateUrl(path, 3600);
  
  return BaseResponseDto.ok(
    { 
      url: signedUrl, 
      path: path, 
      fileName: this.extractFileNameFromUrl(path) 
    },
    'Certification retrieved successfully',
    'OK'
  );
}

async downloadCertificationByPath(
  path: string,
  accountUuid: string
): Promise<BaseResponseDto<FileDownloadResponseDto>> {
  const accountResponse = await this.userService.getAccountByUuid(accountUuid);
  const certifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
  
  if (!certifications.includes(path)) {
    return BaseResponseDto.fail('Certification not found', 'NOT_FOUND');
  }
  
  const { data, mimeType, fileName } = await this.storage.downloadFile(path, 'pivota-private');
  
  const result: FileDownloadResponseDto = {
    buffer: data,
    mimeType: mimeType,
    fileName: fileName,
  };
  
  return BaseResponseDto.ok(result, 'Certification downloaded successfully', 'OK');
}

// ===========================================================
// BULK DOWNLOAD METHODS
// ===========================================================

async bulkDownloadJobSeekerPortfolioItems(
  itemUrls: string[],
  accountUuid: string
): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
  const accountResponse = await this.userService.getAccountByUuid(accountUuid);
  const existingUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
  
  // Verify all items belong to the user
  const invalidUrls = itemUrls.filter(url => !existingUrls.includes(url));
  if (invalidUrls.length > 0) {
    return BaseResponseDto.fail(
      `Some items not found in portfolio: ${invalidUrls.join(', ')}`,
      'NOT_FOUND'
    );
  }
  
  // Download all files
  const files: { buffer: Buffer; fileName: string }[] = [];
  for (const url of itemUrls) {
    const { data, fileName } = await this.storage.downloadFile(url, 'pivota-public');
    files.push({ buffer: data, fileName });
  }
  
  const zipBuffer = await this.createZipArchive(files);
  
  const result: ZipDownloadResponseDto = {
    buffer: zipBuffer,
    fileName: `portfolio_${Date.now()}.zip`,
  };
  
  return BaseResponseDto.ok(result, 'Portfolio items downloaded successfully', 'OK');
}

async bulkDownloadSkilledProfessionalPortfolioItems(
  itemUrls: string[],
  accountUuid: string
): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
  const accountResponse = await this.userService.getAccountByUuid(accountUuid);
  const existingUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
  
  // Verify all items belong to the user
  const invalidUrls = itemUrls.filter(url => !existingUrls.includes(url));
  if (invalidUrls.length > 0) {
    return BaseResponseDto.fail(
      `Some items not found in portfolio: ${invalidUrls.join(', ')}`,
      'NOT_FOUND'
    );
  }
  
  // Download all files
  const files: { buffer: Buffer; fileName: string }[] = [];
  for (const url of itemUrls) {
    const { data, fileName } = await this.storage.downloadFile(url, 'pivota-public');
    files.push({ buffer: data, fileName });
  }
  
  const zipBuffer = await this.createZipArchive(files);
  
  const result: ZipDownloadResponseDto = {
    buffer: zipBuffer,
    fileName: `portfolio_${Date.now()}.zip`,
  };
  
  return BaseResponseDto.ok(result, 'Portfolio items downloaded successfully', 'OK');
}

async bulkDownloadCertifications(
  certPaths: string[],
  accountUuid: string
): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
  const accountResponse = await this.userService.getAccountByUuid(accountUuid);
  const existingCerts = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
  
  const invalidPaths = certPaths.filter(path => !existingCerts.includes(path));
  if (invalidPaths.length > 0) {
    return BaseResponseDto.fail(
      `Some certifications not found: ${invalidPaths.join(', ')}`,
      'NOT_FOUND'
    );
  }
  
  const files: { buffer: Buffer; fileName: string }[] = [];
  for (const path of certPaths) {
    const { data, fileName } = await this.storage.downloadFile(path, 'pivota-private');
    files.push({ buffer: data, fileName });
  }
  
  const zipBuffer = await this.createZipArchive(files);
  
  const result: ZipDownloadResponseDto = {
    buffer: zipBuffer,
    fileName: `certifications_${Date.now()}.zip`,
  };
  
  return BaseResponseDto.ok(result, 'Certifications downloaded successfully', 'OK');
}

// ===========================================================
// GENERIC FILE DELETE
// ===========================================================

async deleteFile(
  url: string,
  bucketName: string,
): Promise<BaseResponseDto<null>> {
  await this.storage.deleteFiles([url], bucketName);
  return BaseResponseDto.ok(null, 'File deleted successfully', 'OK');
}

private async createZipArchive(
  files: { buffer: Buffer; fileName: string }[]
): Promise<Buffer> {
  const archiver = require('archiver');
  const { Readable } = require('stream');
  
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(new Uint8Array(chunk));
    });
    
    archive.on('end', () => {
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(Buffer.from(result));
    });
    
    archive.on('error', (err: Error) => reject(err));
    
    for (const file of files) {
      const readableStream = Readable.from(file.buffer);
      archive.append(readableStream, { name: file.fileName });
    }
    
    archive.finalize();
  });
}


}