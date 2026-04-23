// ======================================================
// RESPONSE DTOS
// ======================================================

export class MediaUploadResponseDto {
  message!: string;
  url!: string;
  fileName!: string;
  fileSize!: number;
  mimeType!: string;
}

export class MediaUploadMultipleResponseDto {
  message!: string;
  items!: MediaUploadResponseDto[];
}

export class PortfolioItemDto {
  url!: string;
  fileName!: string;
  fileSize!: number;
  mimeType!: string;
  uploadedAt!: string;
  order!: number;
}

export class PortfolioResponseDto {
  items!: PortfolioItemDto[];
  total!: number;
}

export class CertificationItemDto {
  url!: string;
  path!: string;
  fileName!: string;
  fileSize!: number;
  mimeType!: string;
  uploadedAt!: string;
}

export class CertificationResponseDto {
  items!: CertificationItemDto[];
  total!: number;
}

export class FileDownloadResponseDto {
  buffer!: Buffer;
  mimeType!: string;
  fileName!: string;
}

export class ZipDownloadResponseDto {
  buffer!: Buffer;
  fileName!: string;
}

export class BulkDeleteResultDto {
  deletedCount!: number;
  failedUrls?: string[];
}