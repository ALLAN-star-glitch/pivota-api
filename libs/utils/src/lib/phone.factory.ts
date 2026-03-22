// libs/utils/src/lib/phone/phone.factory.ts

import { BasePhoneHandler } from './phone.base';
import { KenyaPhoneHandler } from './phone.kenya';

export class PhoneFactory {
  private static handlers: Map<string, BasePhoneHandler> = new Map();
  
  static {
    // Register country handlers
    this.handlers.set('254', new KenyaPhoneHandler());
    // Future: this.handlers.set('1', new USPhoneHandler());
    // Future: this.handlers.set('44', new UKPhoneHandler());
    // Future: this.handlers.set('256', new UgandaPhoneHandler());
  }
  
  /**
   * Get handler by country code
   */
  static getHandler(countryCode: string): BasePhoneHandler | null {
    return this.handlers.get(countryCode) || null;
  }
  
  /**
   * Get handler by phone number (auto-detect)
   */
  static getHandlerByPhone(phone: string): BasePhoneHandler | null {
    const cleaned = phone.replace(/\D/g, '');
    
    // Check for international prefix
    for (const [code, handler] of this.handlers) {
      if (cleaned.startsWith(code)) {
        return handler;
      }
    }
    
    // Check for local format (Kenya: starts with 0 followed by 7 or 1)
    if (cleaned.match(/^0[17]/)) {
      return this.getHandler('254');
    }
    
    return null;
  }
  
  /**
   * Get all available countries
   */
  static getAvailableCountries(): Array<{ code: string; name: string }> {
    return Array.from(this.handlers.values()).map(handler => ({
      code: handler.countryCode,
      name: handler.countryName,
    }));
  }
}