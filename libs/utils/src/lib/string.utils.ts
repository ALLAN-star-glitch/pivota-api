export class StringUtils {
  // Used in auth service for email normalization
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
  
  // Used extensively for JSON fields in Prisma
  static stringifyJsonField<T>(data: T): string {
    return JSON.stringify(data);
  }
  
  static parseJsonField<T>(jsonString: string | null): T | null {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
  
  // Used for generating display names
  static capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  // Used for truncating long text
  static truncate(str: string, maxLength: number, suffix = '...'): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  }
}