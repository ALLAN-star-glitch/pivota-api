import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Validates that a string is a valid CUID.
 * Useful for jobPostId, applicantId, etc.
 */
@Injectable()
export class ParseCuidPipe implements PipeTransform {
  transform(value: string) {
    // CUIDs start with 'c', usually 24-25 chars. 
    // This regex is slightly broader to handle CUID2 as well.
    const cuidRegex = /^[a-z0-9]{20,32}$/i; 
    
    if (!value || !cuidRegex.test(value)) {
      throw new BadRequestException(`Validation failed: "${value}" is not a valid CUID`);
    }
    return value;
  }
}