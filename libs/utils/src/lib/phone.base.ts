// libs/utils/src/lib/phone/phone.base.ts

export interface PhoneNumberDetails {
  raw: string;
  normalized: string;
  formatted: string;
  isValid: boolean;
  countryCode: string;
  countryName: string;
}

export abstract class BasePhoneHandler {
  abstract countryCode: string;
  abstract countryName: string;
  
  /**
   * Normalize phone number to international format (without +)
   */
  abstract normalize(phone: string): string | null;
  
  /**
   * Format phone number for display
   */
  abstract format(phone: string): string;
  
  /**
   * Validate phone number
   */
  abstract validate(phone: string): boolean;
  
  /**
   * Get full phone number details
   */
  getDetails(phone: string): PhoneNumberDetails | null {
    const normalized = this.normalize(phone);
    if (!normalized) return null;
    
    return {
      raw: phone,
      normalized,
      formatted: this.format(phone),
      isValid: this.validate(phone),
      countryCode: this.countryCode,
      countryName: this.countryName,
    };
  }
}