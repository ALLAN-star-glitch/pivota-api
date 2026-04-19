import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import 'multer'; 

// Define a type for the Multer callback to replace 'any'
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

export const imageFileFilter = (
  _req: Request, 
  file: Express.Multer.File, 
  callback: FileFilterCallback
): void => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
    return callback(
      new BadRequestException('Only image files (JPG, PNG, WebP) are allowed.'),
      false,
    );
  }
  callback(null, true);
};

export const documentFileFilter = (
  _req: Request, 
  file: Express.Multer.File, 
  callback: FileFilterCallback
): void => {
  // Check by mimetype for better security
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  // Also check by extension as fallback
  const allowedExtensions = /\.(pdf|doc|docx|txt)$/i;
  
  if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.test(file.originalname)) {
    return callback(
      new BadRequestException('Only document files (PDF, DOC, DOCX, TXT) are allowed.'),
      false,
    );
  }
  callback(null, true);
};

export const portfolioFileFilter = (
  _req: Request, 
  file: Express.Multer.File, 
  callback: FileFilterCallback
): void => {
  // Allowed MIME types for portfolio items (images + documents)
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  // Allowed extensions as fallback
  const allowedExtensions = /\.(jpg|jpeg|png|webp|pdf|doc|docx)$/i;
  
  if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.test(file.originalname)) {
    return callback(
      new BadRequestException('Only images (JPG, PNG, WEBP) and documents (PDF, DOC, DOCX) are allowed for portfolio items.'),
      false,
    );
  }
  callback(null, true);
};