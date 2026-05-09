/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Google Profile Picture Utilities
 * 
 * Handles downloading and storing Google profile pictures to Supabase storage
 */

import { StorageService } from '@pivota-api/shared-storage';
import { Logger } from '@nestjs/common';

export interface GoogleProfilePictureResult {
  success: boolean;
  url: string | null;
  error?: string;
}

export async function downloadAndStoreGoogleProfilePicture(
  pictureUrl: string | undefined,
  accountUuid: string,  // Use accountUuid
  storageService: StorageService,
  logger?: Logger,
  oldImageUrl?: string | null
): Promise<GoogleProfilePictureResult> {
  if (!pictureUrl) {
    if (logger) {
      logger.log('📸 No Google profile picture URL provided, skipping download');
    }
    return { success: true, url: null };
  }

  try {
    if (logger) {
      logger.log(`📸 Downloading Google profile picture from: ${pictureUrl}`);
    }
    
    // Download the image from Google
    const response = await fetch(pictureUrl);
    
    if (!response.ok) {
      const errorMsg = `Failed to download picture: ${response.status} ${response.statusText}`;
      if (logger) logger.error(`❌ ${errorMsg}`);
      return { success: false, url: null, error: errorMsg };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Determine file extension from content-type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const fileExt = contentType.split('/')[1] || 'jpg';
    
    // Create a unique filename using accountUuid
    const timestamp = Date.now();
    const fileName = `${accountUuid}-${timestamp}.${fileExt}`;
    
    // Create a multer-like file object for the storage service
    const mockFile: Express.Multer.File = {
      fieldname: 'profile',
      originalname: fileName,
      encoding: '7bit',
      mimetype: contentType,
      buffer: buffer,
      size: buffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    
    // Upload to Supabase - use accountUuid for folder
    const folder = `profiles/${accountUuid}`;
    const bucketName = 'pivota-public';
    
    if (logger) {
      logger.log(`📤 Uploading profile picture to storage: ${folder}/${fileName}`);
      if (oldImageUrl) {
        logger.log(`🗑️ Will delete old image: ${oldImageUrl}`);
      }
    }
    
    const uploadedUrl = await storageService.uploadFile(
      mockFile, 
      folder, 
      bucketName,
      oldImageUrl
    );
    
    if (logger) {
      logger.log(`✅ Profile picture stored successfully at: ${uploadedUrl}`);
    }
    
    return { success: true, url: uploadedUrl };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (logger) {
      logger.error(`❌ Failed to download/store Google profile picture: ${errorMessage}`);
    }
    return { success: false, url: null, error: errorMessage };
  }
}

/**
 * Validate if a URL is a valid Google profile picture URL
 */
export function isValidGoogleProfilePictureUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('https://lh3.googleusercontent.com/') || 
         url.startsWith('https://play-lh.googleusercontent.com/');
}

/**
 * Get default profile image based on user's initials
 * This can be used as a fallback when Google profile picture is not available
 */
export function getInitialsAvatarUrl(firstName: string, lastName: string): string {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  // You can return a URL to a default avatar service or a local asset
  // For example: https://ui-avatars.com/api/?name=${initials}&background=random
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0D8F81&color=fff&size=256`;
}