// apps/gateway/src/modules/profile/media.service.ts

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { StorageService } from '@pivota-api/shared-storage';
import { 
  BaseResponseDto,
  UpdateFullUserProfileDto, 
  UpdateSkilledProfessionalGrpcRequestDto,
  UpdateJobSeekerGrpcRequestDto,
  UserProfileResponseDto,
  SkilledProfessionalProfileResponseDto,
  JobSeekerProfileResponseDto,
  AccountResponseDto
} from '@pivota-api/dtos';
import { JwtRequest } from '@pivota-api/interfaces';

// ======================================================
// TYPES
// ======================================================

interface ProfileServiceGrpc {
  UpdateUserProfile(
    data: UpdateFullUserProfileDto
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;
  
  UpdateSkilledProfessionalProfile(
    data: UpdateSkilledProfessionalGrpcRequestDto
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  UpdateJobSeekerProfile(
    data: UpdateJobSeekerGrpcRequestDto
  ): Observable<BaseResponseDto<JobSeekerProfileResponseDto>>;
  
  GetAccountByUuid(
    data: { accountUuid: string }
  ): Observable<BaseResponseDto<AccountResponseDto>>;
}

// ======================================================
// RESPONSE DTOS
// ======================================================

export class MediaUploadResponseDto {
  message: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export class MediaUploadMultipleResponseDto {
  message: string;
  items: MediaUploadResponseDto[];
}

export class PortfolioItemDto {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  order: number;
}

export class PortfolioResponseDto {
  items: PortfolioItemDto[];
  total: number;
}

export class CertificationItemDto {
  url: string;           // Signed URL for viewing/downloading
  path: string;          // Stored path for reference
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export class CertificationResponseDto {
  items: CertificationItemDto[];
  total: number;
}

export class FileDownloadResponseDto {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export class ZipDownloadResponseDto {
  buffer: Buffer;
  fileName: string;
}

// Store metadata structure
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
  private grpcService: ProfileServiceGrpc;
  private readonly MAX_PORTFOLIO_ITEMS = 5;

  // Store metadata (in production, this should be in database)
  private jobSeekerPortfolioMetadata: Map<string, StoredPortfolioItem[]> = new Map();
  private skilledProfessionalPortfolioMetadata: Map<string, StoredPortfolioItem[]> = new Map();
  private certificationMetadata: Map<string, StoredCertificationItem[]> = new Map();

  constructor(
    @Inject('PROFILE_PACKAGE') private readonly grpcClient: ClientGrpc,
    private readonly storage: StorageService,
  ) {
    this.grpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

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

  private extractPathFromUrl(url: string): string {
    let path = url;
    
    // Extract path from signed URL if needed
    if (path.includes('/sign/')) {
      const parts = path.split('/sign/');
      if (parts.length > 1) {
        let extractedPath = parts[1].split('?')[0];
        // Remove the bucket name prefix (pivota-private/)
        if (extractedPath.startsWith('pivota-private/')) {
          extractedPath = extractedPath.substring('pivota-private/'.length);
        }
        path = extractedPath;
      }
    }
    
    return path;
  }

  // ===========================================================
  // PROFILE PICTURE
  // ===========================================================

async uploadProfilePicture(
  file: Express.Multer.File,
  req: JwtRequest
): Promise<BaseResponseDto<MediaUploadResponseDto>> {
  const userUuid = req.user.userUuid;
  const accountUuid = req.user.accountId;
  
  // Get old profile image URL
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  const oldProfileImage = accountResponse?.data?.individualProfile?.profileImage;
  
  const { url, fileName, fileSize, mimeType } = await this.uploadFile(file, `profiles/${userUuid}`, 'pivota-public');
  
  const dto: UpdateFullUserProfileDto = {
    userUuid,
    profileImage: url
  };
  
  await firstValueFrom(this.grpcService.UpdateUserProfile(dto));
  
  // Delete old file if it exists and is different
  if (oldProfileImage && oldProfileImage !== url) {
    await this.storage.deleteFiles([oldProfileImage], 'pivota-public');
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
  req: JwtRequest
): Promise<BaseResponseDto<MediaUploadResponseDto>> {
  const accountUuid = req.user.accountId;
  const userUuid = req.user.userUuid;
  
  // Get old logo URL before updating
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  const oldLogo = accountResponse?.data?.individualProfile?.logo;
  
  const { url, fileName, fileSize, mimeType } = await this.uploadFile(file, `logos/${accountUuid}`, 'pivota-public');
  
  const dto: UpdateFullUserProfileDto = {
    userUuid,
    logo: url
  };
  
  await firstValueFrom(this.grpcService.UpdateUserProfile(dto));
  
  // Delete old logo if it exists and is different from the new one
  if (oldLogo && oldLogo !== url) {
    await this.storage.deleteFiles([oldLogo], 'pivota-public');
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
  req: JwtRequest
): Promise<BaseResponseDto<MediaUploadResponseDto>> {
  const userUuid = req.user.userUuid;
  const accountUuid = req.user.accountId;
  
  // Get old cover photo URL before updating
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  const oldCoverPhoto = accountResponse?.data?.individualProfile?.coverPhoto;
  
  const { url, fileName, fileSize, mimeType } = await this.uploadFile(file, `covers/${userUuid}`, 'pivota-public');
  
  const dto: UpdateFullUserProfileDto = {
    userUuid,
    coverPhoto: url
  };
  
  await firstValueFrom(this.grpcService.UpdateUserProfile(dto));
  
  // Delete old cover photo if it exists and is different
  if (oldCoverPhoto && oldCoverPhoto !== url) {
    await this.storage.deleteFiles([oldCoverPhoto], 'pivota-public');
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
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const accountUuid = req.user.accountId;
    const { url, fileName, fileSize, mimeType } = await this.uploadFile(file, `cvs/${accountUuid}`, 'pivota-private');
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      cvUrl: url
    };
    
    await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));
    
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
// GET CV BY PATH
// ===========================================================

async getCVByPath(
  req: JwtRequest
): Promise<BaseResponseDto<{ url: string; fileName: string; path: string }>> {
  const accountUuid = req.user.accountId;
  
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const cvPath = accountResponse?.data?.jobSeekerProfile?.cvUrl;
  
  if (!cvPath) {
    throw BaseResponseDto.fail('CV not found', 'NOT_FOUND');
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
  // GET CV (Signed URL)
  // ===========================================================

  async getCV(
    req: JwtRequest
  ): Promise<BaseResponseDto<{ url: string; fileName: string }>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const cvPath = accountResponse?.data?.jobSeekerProfile?.cvUrl;
    
    if (!cvPath) {
      throw BaseResponseDto.fail('CV not found', 'NOT_FOUND');
    }
    
    const signedUrl = await this.storage.getPrivateUrl(cvPath, 3600);
    
    return BaseResponseDto.ok(
      { url: signedUrl, fileName: this.extractFileNameFromUrl(cvPath) },
      'CV retrieved successfully',
      'OK'
    );
  }

  // ===========================================================
  // DOWNLOAD CV
  // ===========================================================

  async downloadCV(
    req: JwtRequest
  ): Promise<BaseResponseDto<FileDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const cvPath = accountResponse?.data?.jobSeekerProfile?.cvUrl;
    
    if (!cvPath) {
      throw BaseResponseDto.fail('CV not found', 'NOT_FOUND');
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
  // JOB SEEKER PORTFOLIO (APPEND)
  // ===========================================================

  async uploadJobSeekerPortfolioItems(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
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
    
    await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));
    
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


  // ===========================================================
// GET JOB SEEKER PORTFOLIO ITEM BY PATH
// ===========================================================

async getJobSeekerPortfolioItemByPath(
  path: string,
  req: JwtRequest
): Promise<BaseResponseDto<PortfolioItemDto>> {
  const accountUuid = req.user.accountId;
  
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const portfolioUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
  
  // Find the URL that contains the path
  const fullUrl = portfolioUrls.find(url => url.includes(path));
  
  if (!fullUrl) {
    throw BaseResponseDto.fail('Portfolio item not found', 'NOT_FOUND');
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
  // GET ALL JOB SEEKER PORTFOLIO
  // ===========================================================

  async getJobSeekerPortfolioItems(
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
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

  // ===========================================================
  // GET SINGLE JOB SEEKER PORTFOLIO ITEM
  // ===========================================================

  async getJobSeekerPortfolioItem(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const accountUuid = req.user.accountId;
    
    const items = this.jobSeekerPortfolioMetadata.get(accountUuid) || [];
    const item = items.find(i => i.url === imageUrl);
    
    if (!item) {
      throw BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
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

  // ===========================================================
  // DELETE JOB SEEKER PORTFOLIO ITEM
  // ===========================================================

 async deleteJobSeekerPortfolioItem(
  imageUrl: string,
  req: JwtRequest
): Promise<BaseResponseDto<null>> {
  const accountUuid = req.user.accountId;
  
  // Get current portfolio from database
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const existingUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
  
  // Filter out the deleted item
  const updatedUrls = existingUrls.filter(url => url !== imageUrl);
  
  if (updatedUrls.length === existingUrls.length) {
    throw BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
  }
  
  // Update database
  const dto: UpdateJobSeekerGrpcRequestDto = {
    accountUuid,
    portfolioImages: updatedUrls
  };
  
  await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));
  
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
  
  // Delete from storage
  await this.storage.deleteFiles([imageUrl], 'pivota-public');
  
  return BaseResponseDto.ok(null, 'Portfolio item removed successfully', 'OK');
}

  // ===========================================================
  // BULK DELETE JOB SEEKER PORTFOLIO ITEMS
  // ===========================================================

async bulkDeleteJobSeekerPortfolioItems(
  itemUrls: string[],
  req: JwtRequest
): Promise<BaseResponseDto<null>> {
  console.log('>>> BULK DELETE STARTED <<<');
  
  const accountUuid = req.user.accountId;
  
  // Get current portfolio from database
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const existingUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
  
  console.log('Existing count:', existingUrls.length);
  console.log('Delete count:', itemUrls.length);
  
  // Simple filter - remove URLs that match exactly
  const updatedUrls = existingUrls.filter(url => !itemUrls.includes(url));
  
  console.log('Updated count:', updatedUrls.length);
  
  if (updatedUrls.length === existingUrls.length) {
    console.log('ERROR: No items were deleted');
    throw BaseResponseDto.fail('No items were deleted. URLs may not match exactly.', 'NOT_FOUND');
  }
  
  // Update database
  const dto: UpdateJobSeekerGrpcRequestDto = {
    accountUuid,
    portfolioImages: updatedUrls
  };
  
  await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));
  
  // Delete files from storage
  await this.storage.deleteFiles(itemUrls, 'pivota-public');
  
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
  
  console.log('>>> BULK DELETE SUCCESS <<<');
  
  return BaseResponseDto.ok(
    null, 
    `Successfully deleted ${itemUrls.length} portfolio item(s)`, 
    'OK'
  );
}

  // ===========================================================
  // SKILLED PROFESSIONAL PORTFOLIO (APPEND)
  // ===========================================================

  async uploadSkilledProfessionalPortfolioItems(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
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
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    
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

  // ===========================================================
// GET SKILLED PROFESSIONAL PORTFOLIO ITEM BY PATH
// ===========================================================

async getSkilledProfessionalPortfolioItemByPath(
  path: string,
  req: JwtRequest
): Promise<BaseResponseDto<PortfolioItemDto>> {
  const accountUuid = req.user.accountId;
  
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const portfolioUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
  
  // Find the URL that contains the path
  const fullUrl = portfolioUrls.find(url => url.includes(path));
  
  if (!fullUrl) {
    throw BaseResponseDto.fail('Portfolio item not found', 'NOT_FOUND');
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
  // GET ALL SKILLED PROFESSIONAL PORTFOLIO
  // ===========================================================

  async getSkilledProfessionalPortfolioItems(
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
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

  // ===========================================================
  // GET SINGLE SKILLED PROFESSIONAL PORTFOLIO ITEM
  // ===========================================================

  async getSkilledProfessionalPortfolioItem(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<PortfolioItemDto>> {
    const accountUuid = req.user.accountId;
    
    const items = this.skilledProfessionalPortfolioMetadata.get(accountUuid) || [];
    const item = items.find(i => i.url === imageUrl);
    
    if (!item) {
      throw BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
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

  // ===========================================================
  // DELETE SKILLED PROFESSIONAL PORTFOLIO ITEM
  // ===========================================================

  async deleteSkilledProfessionalPortfolioItem(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    const updatedUrls = existingUrls.filter(url => url !== imageUrl);
    
    if (updatedUrls.length === existingUrls.length) {
      throw BaseResponseDto.fail('Item not found in portfolio', 'NOT_FOUND');
    }
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedUrls
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    
    const updatedItems: StoredPortfolioItem[] = updatedUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.skilledProfessionalPortfolioMetadata.set(accountUuid, updatedItems);
    
    await this.storage.deleteFiles([imageUrl], 'pivota-public');
    
    return BaseResponseDto.ok(null, 'Portfolio item removed successfully', 'OK');
  }

  // ===========================================================
  // BULK DELETE SKILLED PROFESSIONAL PORTFOLIO ITEMS
  // ===========================================================

  async bulkDeleteSkilledProfessionalPortfolioItems(
    itemUrls: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    
    const invalidUrls = itemUrls.filter(url => !existingUrls.includes(url));
    if (invalidUrls.length > 0) {
      throw BaseResponseDto.fail(
        `Some items not found in portfolio: ${invalidUrls.join(', ')}`,
        'NOT_FOUND'
      );
    }
    
    const updatedUrls = existingUrls.filter(url => !itemUrls.includes(url));
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedUrls
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    await this.storage.deleteFiles(itemUrls, 'pivota-public');
    
    const updatedItems: StoredPortfolioItem[] = updatedUrls.map((url, index) => ({
      url,
      fileName: this.extractFileNameFromUrl(url),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(url),
      uploadedAt: new Date().toISOString(),
      order: index + 1,
    }));
    this.skilledProfessionalPortfolioMetadata.set(accountUuid, updatedItems);
    
    return BaseResponseDto.ok(
      null, 
      `Successfully deleted ${itemUrls.length} portfolio item(s)`, 
      'OK'
    );
  }

  // ===========================================================
  // CERTIFICATIONS (APPEND)
  // ===========================================================

  async uploadCertifications(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const existingItems = this.certificationMetadata.get(accountUuid) || [];
    
    const newItems: MediaUploadResponseDto[] = [];
    const newStoredItems: StoredCertificationItem[] = [];
    
    for (const file of files) {
      const { url, fileName, fileSize, mimeType } = await this.uploadFile(file, `certifications/${accountUuid}`, 'pivota-private');
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
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    
    const data: MediaUploadMultipleResponseDto = {
      message: `Successfully uploaded ${newItems.length} certification(s)`,
      items: newItems
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // GET ALL CERTIFICATIONS
  // ===========================================================

  async getCertifications(
    req: JwtRequest
  ): Promise<BaseResponseDto<CertificationResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
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

  // ===========================================================
  // DOWNLOAD CERTIFICATION (by path)
  // ===========================================================

  async downloadCertificationByPath(
    path: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<FileDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const certifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    if (!certifications.includes(path)) {
      throw BaseResponseDto.fail('Certification not found', 'NOT_FOUND');
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
// GET CERTIFICATION BY PATH (Returns fresh signed URL)
// ===========================================================

async getCertificationByPath(
  path: string,
  req: JwtRequest
): Promise<BaseResponseDto<{ url: string; path: string; fileName: string }>> {
  const accountUuid = req.user.accountId;
  
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const certifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
  
  if (!certifications.includes(path)) {
    throw BaseResponseDto.fail('Certification not found', 'NOT_FOUND');
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

  // ===========================================================
  // BULK DOWNLOAD CERTIFICATIONS (as ZIP)
  // ===========================================================

  async bulkDownloadCertifications(
    paths: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingCertifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    const invalidPaths = paths.filter(path => !existingCertifications.includes(path));
    if (invalidPaths.length > 0) {
      throw BaseResponseDto.fail(
        `Some certifications not found: ${invalidPaths.join(', ')}`,
        'NOT_FOUND'
      );
    }
    
    const files: { buffer: Buffer; fileName: string }[] = [];
    for (const path of paths) {
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
// BULK DOWNLOAD JOB SEEKER PORTFOLIO ITEMS (as ZIP)
// ===========================================================

async bulkDownloadJobSeekerPortfolioItems(
  itemUrls: string[],
  req: JwtRequest
): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
  const accountUuid = req.user.accountId;
  
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const existingUrls = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
  
  // Verify all items belong to the user
  const invalidUrls = itemUrls.filter(url => !existingUrls.includes(url));
  if (invalidUrls.length > 0) {
    throw BaseResponseDto.fail(
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



// ===========================================================
// BULK DOWNLOAD SKILLED PROFESSIONAL PORTFOLIO ITEMS (as ZIP)
// ===========================================================

async bulkDownloadSkilledProfessionalPortfolioItems(
  itemUrls: string[],
  req: JwtRequest
): Promise<BaseResponseDto<ZipDownloadResponseDto>> {
  const accountUuid = req.user.accountId;
  
  const accountResponse = await firstValueFrom(
    this.grpcService.GetAccountByUuid({ accountUuid })
  );
  
  const existingUrls = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
  
  // Verify all items belong to the user
  const invalidUrls = itemUrls.filter(url => !existingUrls.includes(url));
  if (invalidUrls.length > 0) {
    throw BaseResponseDto.fail(
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

  // ===========================================================
  // DELETE CERTIFICATION (by path)
  // ===========================================================

  async deleteCertificationByPath(
    path: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    const existingItems = this.certificationMetadata.get(accountUuid) || [];
    const updatedItems = existingItems.filter(item => item.url !== path);
    
    if (updatedItems.length === existingItems.length) {
      throw BaseResponseDto.fail('Certification not found', 'NOT_FOUND');
    }
    
    this.certificationMetadata.set(accountUuid, updatedItems);
    
    const urls = updatedItems.map(item => item.url);
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      certifications: urls
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    await this.storage.deleteFiles([path], 'pivota-private');
    
    return BaseResponseDto.ok(null, 'Certification removed successfully', 'OK');
  }

  // ===========================================================
  // BULK DELETE CERTIFICATIONS (by paths)
  // ===========================================================

  async bulkDeleteCertificationsByPaths(
    paths: string[],
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingCertifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    const invalidPaths = paths.filter(path => !existingCertifications.includes(path));
    if (invalidPaths.length > 0) {
      throw BaseResponseDto.fail(
        `Some certifications not found: ${invalidPaths.join(', ')}`,
        'NOT_FOUND'
      );
    }
    
    const updatedCertifications = existingCertifications.filter(path => !paths.includes(path));
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      certifications: updatedCertifications
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    await this.storage.deleteFiles(paths, 'pivota-private');
    
    const updatedItems: StoredCertificationItem[] = updatedCertifications.map((path) => ({
      url: path,
      fileName: this.extractFileNameFromUrl(path),
      fileSize: 0,
      mimeType: this.getMimeTypeFromUrl(path),
      uploadedAt: new Date().toISOString(),
    }));
    this.certificationMetadata.set(accountUuid, updatedItems);
    
    return BaseResponseDto.ok(
      null, 
      `Successfully deleted ${paths.length} certification(s)`, 
      'OK'
    );
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
}