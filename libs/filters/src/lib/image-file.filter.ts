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