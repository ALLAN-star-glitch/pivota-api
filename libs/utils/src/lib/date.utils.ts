export class DateUtils {
  // Used for OTP expiration
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }
  
  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000);
  }
  
  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86400000);
  }
  
  // Format date for display
  static formatDate(date: Date): string {
    return date.toISOString();
  }
  
  // Check if token is expired
  static isExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  }
  
  // Get time remaining in minutes
  static getMinutesRemaining(expiresAt: Date): number {
    const remaining = expiresAt.getTime() - new Date().getTime();
    return Math.ceil(remaining / 60000);
  }
}