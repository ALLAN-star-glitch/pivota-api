// libs/utils/src/lib/phone/phone.kenya.ts

import { BasePhoneHandler } from './phone.base';

export class KenyaPhoneHandler extends BasePhoneHandler {
  countryCode = '254';
  countryName = 'Kenya';
  
  // Kenyan phone regex: starts with 254 followed by 7 or 1, then 8 digits
  phoneRegex = /^254[17]\d{8}$/;
  
  /**
   * Normalize Kenyan phone number to international format (254XXXXXXXXX)
   * Examples:
   * - 0712345678 -> 254712345678
   * - 254712345678 -> 254712345678
   * - +254712345678 -> 254712345678
   * - 712345678 -> 254712345678
   */
  normalize(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 0 (local format)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Remove +254 or 254 if present
    if (cleaned.startsWith('254')) {
      cleaned = cleaned.substring(3);
    }
    
    // Add 254 prefix if it starts with 7 or 1
    if (cleaned.match(/^[17]/)) {
      cleaned = `254${cleaned}`;
    }
    
    // Validate the result - use regex directly, don't call validate() to avoid recursion
    if (this.phoneRegex.test(cleaned)) {
      return cleaned;
    }
    
    return null;
  }
  
  /**
   * Format Kenyan phone number for display
   */
  format(phone: string): string {
    const normalized = this.normalize(phone);
    if (!normalized) return phone;
    
    const local = normalized.replace('254', '0');
    
    if (local.length === 10) {
      return `${local.substring(0, 3)} ${local.substring(3, 6)} ${local.substring(6)}`;
    }
    
    return local;
  }
  
  /**
   * Validate Kenyan phone number
   */
  validate(phone: string): boolean {
    const normalized = this.normalize(phone);
    if (!normalized) return false;
    return this.phoneRegex.test(normalized);
  }
  
  /**
   * Get network provider
   */
  getNetworkProvider(phone: string): string | null {
    const normalized = this.normalize(phone);
    if (!normalized) return null;
    
    const prefix = normalized.substring(3, 5);
    
    const networks: Record<string, string> = {
      '71': 'Safaricom',
      '72': 'Safaricom', 
      '74': 'Safaricom',
      '73': 'Airtel',
      '77': 'Telkom',
      '76': 'Equitel',
    };
    
    return networks[prefix] || 'Other';
  }
} 