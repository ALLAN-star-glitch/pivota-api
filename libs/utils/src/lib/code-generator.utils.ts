export class CodeGenerator {
  // Used in auth service for user/account codes
  static generateUserCode(): string {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `USR-${randomPart}`;
  }
  
  static generateAccountCode(): string {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `ACC-${randomPart}`;
  }
  
  static generateOrganizationCode(): string {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `ORG-${randomPart}`;
  }
  
  // Used for OTP generation
  static generateOTP(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
  
  // Used for invitation tokens
  static generateToken(): string {
    return crypto.randomUUID();
  }
}