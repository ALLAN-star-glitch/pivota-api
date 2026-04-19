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
}

export class MediaUploadMultipleResponseDto {
  message: string;
  urls: string[];
}

// ======================================================
// SERVICE
// ======================================================

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private grpcService: ProfileServiceGrpc;

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
  ): Promise<string> {
    const url = await this.storage.uploadFile(file, folder, bucketName);
    return url;
  }

  // ===========================================================
  // PROFILE PICTURE
  // ===========================================================

  async uploadProfilePicture(
    file: Express.Multer.File,
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadResponseDto>> {
    const userUuid = req.user.userUuid;
    const url = await this.uploadFile(file, `profiles/${userUuid}`, 'pivota-public');
    
    const dto: UpdateFullUserProfileDto = {
      userUuid,
      profileImage: url
    };
    
    await firstValueFrom(this.grpcService.UpdateUserProfile(dto));
    
    const data: MediaUploadResponseDto = {
      message: 'Profile picture uploaded successfully',
      url
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
    
    const url = await this.uploadFile(file, `logos/${accountUuid}`, 'pivota-public');
    
    const dto: UpdateFullUserProfileDto = {
      userUuid,
      logo: url
    };
    
    await firstValueFrom(this.grpcService.UpdateUserProfile(dto));
    
    const data: MediaUploadResponseDto = {
      message: 'Logo uploaded successfully',
      url
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
    const url = await this.uploadFile(file, `covers/${userUuid}`, 'pivota-public');
    
    const dto: UpdateFullUserProfileDto = {
      userUuid,
      coverPhoto: url
    };
    
    await firstValueFrom(this.grpcService.UpdateUserProfile(dto));
    
    const data: MediaUploadResponseDto = {
      message: 'Cover photo uploaded successfully',
      url
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
    const url = await this.uploadFile(file, `cvs/${accountUuid}`, 'pivota-private');
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      cvUrl: url
    };
    
    await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));
    
    const data: MediaUploadResponseDto = {
      message: 'CV uploaded successfully',
      url
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // JOB SEEKER PORTFOLIO (APPEND)
  // ===========================================================

  async uploadJobSeekerPortfolioImages(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    const newUrls: string[] = [];
    
    // Upload new files
    for (const file of files) {
      const url = await this.uploadFile(file, `portfolio/${accountUuid}`, 'pivota-public');
      newUrls.push(url);
    }
    
    // Get existing job seeker profile
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingPortfolio = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
    
    // Append new URLs to existing ones
    const allPortfolio = [...existingPortfolio, ...newUrls];
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      portfolioImages: allPortfolio
    };
    
    await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));
    
    const data: MediaUploadMultipleResponseDto = {
      message: 'Job seeker portfolio images uploaded successfully',
      urls: newUrls  // Return only the newly uploaded URLs
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // SKILLED PROFESSIONAL PORTFOLIO (APPEND)
  // ===========================================================

  async uploadSkilledProfessionalPortfolioImages(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    const newUrls: string[] = [];
    
    // Upload new files
    for (const file of files) {
      const url = await this.uploadFile(file, `portfolio/${accountUuid}`, 'pivota-public');
      newUrls.push(url);
    }
    
    // Get existing skilled professional profile
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingPortfolio = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    
    // Append new URLs to existing ones
    const allPortfolio = [...existingPortfolio, ...newUrls];
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      portfolioImages: allPortfolio
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    
    const data: MediaUploadMultipleResponseDto = {
      message: 'Skilled professional portfolio images uploaded successfully',
      urls: newUrls  // Return only the newly uploaded URLs
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // CERTIFICATIONS (APPEND)
  // ===========================================================

  async uploadCertifications(
    files: Express.Multer.File[],
    req: JwtRequest
  ): Promise<BaseResponseDto<MediaUploadMultipleResponseDto>> {
    const accountUuid = req.user.accountId;
    const newUrls: string[] = [];
    
    // Upload new files
    for (const file of files) {
      const url = await this.uploadFile(file, `certifications/${accountUuid}`, 'pivota-private');
      newUrls.push(url);
    }
    
    // Get existing skilled professional profile
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingCertifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    // Append new URLs to existing ones
    const allCertifications = [...existingCertifications, ...newUrls];
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      certifications: allCertifications
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    
    const data: MediaUploadMultipleResponseDto = {
      message: 'Certifications uploaded successfully',
      urls: newUrls  // Return only the newly uploaded URLs
    };
    
    return BaseResponseDto.ok(data, data.message, 'OK');
  }

  // ===========================================================
  // DELETE SINGLE PORTFOLIO IMAGE (JOB SEEKER)
  // ===========================================================

  async deleteJobSeekerPortfolioImage(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    // Get existing job seeker profile
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingPortfolio = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
    
    // Filter out the image to remove
    const updatedPortfolio = existingPortfolio.filter(url => url !== imageUrl);
    
    if (updatedPortfolio.length === existingPortfolio.length) {
      const data: BaseResponseDto<null> = BaseResponseDto.fail('Image not found in portfolio', 'NOT_FOUND');
      throw data;
    }
    
    const dto: UpdateJobSeekerGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedPortfolio
    };
    
    await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));
    
    // Delete the file from storage
    await this.storage.deleteFiles([imageUrl], 'pivota-public');
    
    return BaseResponseDto.ok(null, 'Portfolio image removed successfully', 'OK');
  }

  // ===========================================================
  // DELETE SINGLE PORTFOLIO IMAGE (SKILLED PROFESSIONAL)
  // ===========================================================

  async deleteSkilledProfessionalPortfolioImage(
    imageUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    // Get existing skilled professional profile
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingPortfolio = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    
    // Filter out the image to remove
    const updatedPortfolio = existingPortfolio.filter(url => url !== imageUrl);
    
    if (updatedPortfolio.length === existingPortfolio.length) {
      const data: BaseResponseDto<null> = BaseResponseDto.fail('Image not found in portfolio', 'NOT_FOUND');
      throw data;
    }
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      portfolioImages: updatedPortfolio
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    
    // Delete the file from storage
    await this.storage.deleteFiles([imageUrl], 'pivota-public');
    
    return BaseResponseDto.ok(null, 'Portfolio image removed successfully', 'OK');
  }

  // ===========================================================
  // DELETE SINGLE CERTIFICATION
  // ===========================================================

  async deleteCertification(
    certificationUrl: string,
    req: JwtRequest
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;
    
    // Get existing skilled professional profile
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const existingCertifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    // Filter out the certification to remove
    const updatedCertifications = existingCertifications.filter(url => url !== certificationUrl);
    
    if (updatedCertifications.length === existingCertifications.length) {
      const data: BaseResponseDto<null> = BaseResponseDto.fail('Certification not found', 'NOT_FOUND');
      throw data;
    }
    
    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      accountUuid,
      certifications: updatedCertifications
    };
    
    await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));
    
    // Delete the file from storage
    await this.storage.deleteFiles([certificationUrl], 'pivota-private');
    
    return BaseResponseDto.ok(null, 'Certification removed successfully', 'OK');
  }

  // ===========================================================
  // DELETE ANY FILE (GENERIC)
  // ===========================================================

  async deleteFile(
    url: string,
    bucketName: string,
  ): Promise<BaseResponseDto<null>> {
    await this.storage.deleteFiles([url], bucketName);
    return BaseResponseDto.ok(null, 'File deleted successfully', 'OK');
  }

  // ===========================================================
  // GET ALL PORTFOLIO IMAGES (JOB SEEKER)
  // ===========================================================

  async getJobSeekerPortfolioImages(
    req: JwtRequest
  ): Promise<BaseResponseDto<{ urls: string[] }>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const portfolioImages = accountResponse?.data?.jobSeekerProfile?.portfolioImages || [];
    
    return BaseResponseDto.ok(
      { urls: portfolioImages },
      'Portfolio images retrieved successfully',
      'OK'
    );
  }

  // ===========================================================
  // GET ALL PORTFOLIO IMAGES (SKILLED PROFESSIONAL)
  // ===========================================================

  async getSkilledProfessionalPortfolioImages(
    req: JwtRequest
  ): Promise<BaseResponseDto<{ urls: string[] }>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const portfolioImages = accountResponse?.data?.skilledProfessionalProfile?.portfolioImages || [];
    
    return BaseResponseDto.ok(
      { urls: portfolioImages },
      'Portfolio images retrieved successfully',
      'OK'
    );
  }

  // ===========================================================
  // GET ALL CERTIFICATIONS
  // ===========================================================

  async getCertifications(
    req: JwtRequest
  ): Promise<BaseResponseDto<{ urls: string[] }>> {
    const accountUuid = req.user.accountId;
    
    const accountResponse = await firstValueFrom(
      this.grpcService.GetAccountByUuid({ accountUuid })
    );
    
    const certifications = accountResponse?.data?.skilledProfessionalProfile?.certifications || [];
    
    return BaseResponseDto.ok(
      { urls: certifications },
      'Certifications retrieved successfully',
      'OK'
    );
  }
}