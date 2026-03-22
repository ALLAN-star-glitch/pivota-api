// libs/utils/src/lib/phone/phone.utils.ts

import { PhoneFactory } from './phone.factory';
import { PhoneNumberDetails } from './phone.base';

export class PhoneUtils {
  /**
   * Normalize phone number (auto-detect country)
   */
  static normalize(phone: string, countryCode?: string): string | null {
    const handler = countryCode 
      ? PhoneFactory.getHandler(countryCode)
      : PhoneFactory.getHandlerByPhone(phone);
    
    if (!handler) return null;
    return handler.normalize(phone);
  }
  
  /**
   * Format phone number for display (auto-detect country)
   */
  static format(phone: string, countryCode?: string): string {
    const handler = countryCode 
      ? PhoneFactory.getHandler(countryCode)
      : PhoneFactory.getHandlerByPhone(phone);
    
    if (!handler) return phone;
    return handler.format(phone);
  }
  
  /**
   * Validate phone number (auto-detect country)
   */
  static validate(phone: string, countryCode?: string): boolean {
    const handler = countryCode 
      ? PhoneFactory.getHandler(countryCode)
      : PhoneFactory.getHandlerByPhone(phone);
    
    if (!handler) return false;
    return handler.validate(phone);
  }
  
  /**
   * Get detailed phone number info (auto-detect country)
   */
  static getDetails(phone: string, countryCode?: string): PhoneNumberDetails | null {
    const handler = countryCode 
      ? PhoneFactory.getHandler(countryCode)
      : PhoneFactory.getHandlerByPhone(phone);
    
    if (!handler) return null;
    return handler.getDetails(phone);
  }
  
  /**
   * Get all supported countries
   */
  static getSupportedCountries(): Array<{ code: string; name: string }> {
    return PhoneFactory.getAvailableCountries();
  }
  
  /**
   * Check if a country is supported
   */
  static isCountrySupported(countryCode: string): boolean {
    return PhoneFactory.getHandler(countryCode) !== null;
  }
}

// Export types for convenience
export type { PhoneNumberDetails } from './phone.base';