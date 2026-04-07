// libs/shared-redis/src/lib/rate-limit.config.ts

export interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
  errorMessage: (minutes: number, attempts?: number) => string;
  successMessage?: string;
  requires2FA?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  validation?: {
    userExists?: 'required' | 'forbidden' | 'ignore';
    returnSuccessOnNonExistent?: boolean;
    requireDelayOnError?: boolean;
    customMessage?: {
      userExists?: string;
      userNotFound?: string;
    };
  };
}

// ============================================================
 // RATE LIMIT TYPES
// ============================================================

export type RateLimitType = 
  // OTP Purposes
  | OtpPurpose
  // Non-OTP Rate Limits
  | 'SIGNUP_ATTEMPTS'
  | 'MFA_VERIFICATION'
  | 'LOGIN_ATTEMPTS'
  | 'OTP_VERIFICATION'

// ============================================================
 // OTP PURPOSES FOR PIVOTACONNECT
// ============================================================

export type OtpPurpose = 
  // EMAIL VERIFICATION (Account creation, email changes)
  | 'EMAIL_VERIFICATION'
  | 'ORGANIZATION_EMAIL_VERIFICATION'
  | 'CHANGE_EMAIL'
  
  // TWO-FACTOR AUTH (Login security)
  | 'LOGIN_2FA'
  | 'MFA_RECOVERY'
  
  // ACCOUNT SECURITY (Password, phone, delete)
  | 'PASSWORD_RESET'
  | 'CHANGE_PHONE'
  | 'DELETE_ACCOUNT'
  
  // FINANCIAL TRANSACTIONS (Money movement)
  | 'WITHDRAWAL'
  | 'ESCROW_RELEASE'
  | 'PAYMENT_CONFIRM'
  
  // PILLAR 1: EMPLOYMENT
  | 'JOB_ACCEPT'
  | 'CONTRACT_SIGN'
  
  // PILLAR 2: HOUSING
  | 'LEASE_SIGN'
  | 'DEPOSIT_CONFIRM'
  
  // PILLAR 3: SOCIAL SUPPORT
  | 'AID_RECEIPT'
  | 'CASH_DISBURSEMENT';

// Create a runtime enum for Swagger decorator
export const OtpPurposeEnum = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  ORGANIZATION_EMAIL_VERIFICATION: 'ORGANIZATION_EMAIL_VERIFICATION',
  LOGIN_2FA: 'LOGIN_2FA',
  PASSWORD_RESET: 'PASSWORD_RESET',
  CHANGE_EMAIL: 'CHANGE_EMAIL',
  CHANGE_PHONE: 'CHANGE_PHONE',
  WITHDRAWAL: 'WITHDRAWAL',
  ESCROW_RELEASE: 'ESCROW_RELEASE',
  PAYMENT_CONFIRM: 'PAYMENT_CONFIRM',
  JOB_ACCEPT: 'JOB_ACCEPT',
  CONTRACT_SIGN: 'CONTRACT_SIGN',
  LEASE_SIGN: 'LEASE_SIGN',
  DEPOSIT_CONFIRM: 'DEPOSIT_CONFIRM',
  AID_RECEIPT: 'AID_RECEIPT',
  CASH_DISBURSEMENT: 'CASH_DISBURSEMENT',
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',
  MFA_RECOVERY: 'MFA_RECOVERY',
} as const;

// ============================================================
 // ALL RATE LIMIT CONFIGURATIONS (Single Source)
// ============================================================

export const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  // ========== OTP PURPOSES ==========
  'EMAIL_VERIFICATION': {
    maxAttempts: 10,
    windowSeconds: 3600,
    priority: 'low',
    requires2FA: false,
    validation: {
      userExists: 'forbidden',
      customMessage: {
        userExists: 'This email is already registered.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many signup attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Verification code sent. Please check your email to complete signup.'
  },

  'OTP_VERIFICATION': {
    maxAttempts: 5,
    windowSeconds: 900, // 5 attempts per 15 minutes
    priority: 'high',
    requires2FA: false,
    errorMessage: (minutes: number) => 
        `Too many verification attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Verification successful.'
    },
  
  'ORGANIZATION_EMAIL_VERIFICATION': {
    maxAttempts: 10,
    windowSeconds: 3600,
    priority: 'low',
    requires2FA: false,
    validation: {
      userExists: 'forbidden',
      customMessage: {
        userExists: 'This email is already registered.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many attempts. Try again in ${minutes} minutes. Please ensure you're using your work email.`,
    successMessage: 'Verification code sent to your business email.'
  },
  
  'CHANGE_EMAIL': {
    maxAttempts: 5,
    windowSeconds: 3600,
    priority: 'medium',
    requires2FA: true,
    validation: {
      userExists: 'forbidden',
      customMessage: {
        userExists: 'This email is already in use.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many email change attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Verification code sent to your new email address.'
  },

  'LOGIN_2FA': {
    maxAttempts: 3,
    windowSeconds: 600,
    priority: 'high',
    requires2FA: false,
    validation: {
      userExists: 'required',
      requireDelayOnError: true,
      customMessage: {
        userNotFound: 'Account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many login attempts. Try again in ${minutes} minutes. Contact support if you've lost access.`,
    successMessage: 'Login verification code sent to your email.'
  },
  
  'MFA_RECOVERY': {
    maxAttempts: 3,
    windowSeconds: 1800,
    priority: 'high',
    requires2FA: false,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'Account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many recovery attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Recovery code sent to your backup email.'
  },

  'PASSWORD_RESET': {
    maxAttempts: 3,
    windowSeconds: 900,
    priority: 'high',
    requires2FA: false,
    validation: {
      userExists: 'required',
      returnSuccessOnNonExistent: true,
      customMessage: {
        userNotFound: 'If an account exists, a code has been sent.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many reset attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Password reset code sent. Check your email.'
  },
  
  'CHANGE_PHONE': {
    maxAttempts: 3,
    windowSeconds: 3600,
    priority: 'high',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'User account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many phone change attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Verification code sent to your new phone number.'
  },
  
  'DELETE_ACCOUNT': {
    maxAttempts: 3,
    windowSeconds: 900,
    priority: 'critical',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'Account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many delete account attempts. Try again in ${minutes} minutes. This action is irreversible.`,
    successMessage: 'Account deletion code sent. Please verify to proceed.'
  },

  'WITHDRAWAL': {
    maxAttempts: 3,
    windowSeconds: 900,
    priority: 'critical',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'Account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many withdrawal attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Withdrawal verification code sent.'
  },
  
  'ESCROW_RELEASE': {
    maxAttempts: 3,
    windowSeconds: 600,
    priority: 'critical',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'Account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many escrow release attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Escrow release code sent.'
  },
  
  'PAYMENT_CONFIRM': {
    maxAttempts: 3,
    windowSeconds: 600,
    priority: 'critical',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'Account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many payment attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Payment confirmation code sent.'
  },

  'JOB_ACCEPT': {
    maxAttempts: 5,
    windowSeconds: 1800,
    priority: 'high',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'User account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many job acceptance attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Job acceptance code sent. Verify to confirm position.'
  },
  
  'CONTRACT_SIGN': {
    maxAttempts: 5,
    windowSeconds: 3600,
    priority: 'critical',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'User account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many contract signing attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Contract signing code sent.'
  },

  'LEASE_SIGN': {
    maxAttempts: 5,
    windowSeconds: 3600,
    priority: 'critical',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'User account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many lease signing attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Lease signing code sent.'
  },
  
  'DEPOSIT_CONFIRM': {
    maxAttempts: 3,
    windowSeconds: 900,
    priority: 'high',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'User account not found.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many deposit confirmation attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Deposit confirmation code sent.'
  },

  'AID_RECEIPT': {
    maxAttempts: 10,
    windowSeconds: 7200,
    priority: 'medium',
    requires2FA: false,
    validation: {
      userExists: 'ignore'
    },
    errorMessage: (minutes: number) => 
      `Tafadhali jaribu tena baada ya dakika ${minutes}. Please try again in ${minutes} minutes.`,
    successMessage: 'Aid receipt confirmed. Your response has been recorded.'
  },
  
  'CASH_DISBURSEMENT': {
    maxAttempts: 5,
    windowSeconds: 3600,
    priority: 'high',
    requires2FA: true,
    validation: {
      userExists: 'required',
      customMessage: {
        userNotFound: 'Beneficiary not found. Please contact support.'
      }
    },
    errorMessage: (minutes: number) => 
      `Too many disbursement attempts. Call 0800-123-456 for help. Try again in ${minutes} minutes.`,
    successMessage: 'Disbursement code sent. Verify to receive funds.'
  },

  // ========== NON-OTP RATE LIMITS ==========
  'SIGNUP_ATTEMPTS': {
    maxAttempts: 5,
    windowSeconds: 3600,
    priority: 'medium',
    requires2FA: false,
    errorMessage: (minutes: number) => 
      `Too many signup attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Signup verification code sent.'
  },
  
  'MFA_VERIFICATION': {
    maxAttempts: 3,
    windowSeconds: 600,
    priority: 'high',
    requires2FA: false,
    errorMessage: (minutes: number) => 
      `Too many verification attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Verification successful.'
  },
  
  'LOGIN_ATTEMPTS': {
    maxAttempts: 5,
    windowSeconds: 900,
    priority: 'high',
    requires2FA: false,
    errorMessage: (minutes: number) => 
      `Too many failed login attempts. Try again in ${minutes} minutes.`,
    successMessage: 'Login successful.'
  },
};

// ============================================================
 // DEFAULT CONFIGURATION
// ============================================================

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowSeconds: 900,
  priority: 'medium',
  requires2FA: false,
  validation: {
    userExists: 'ignore'
  },
  errorMessage: (minutes: number) => 
    `Too many attempts. Try again in ${minutes} minutes.`,
  successMessage: 'Verification code sent to your email.'
};

// ============================================================
 // SINGLE HELPER FUNCTION
// ============================================================

/**
 * Get rate limit configuration for any type
 */
export function getRateLimitConfig(type: RateLimitType): RateLimitConfig {
  return RATE_LIMIT_CONFIGS[type] || DEFAULT_RATE_LIMIT_CONFIG;
}

/**
 * Check if an action requires 2FA
 */
export function requiresTwoFactor(purpose: OtpPurpose): boolean {
  const config = getRateLimitConfig(purpose);
  return config.requires2FA || false;
}

/**
 * Get validation rule for a purpose
 */
export function getValidationRule(purpose: OtpPurpose): {
  userExists?: 'required' | 'forbidden' | 'ignore';
  returnSuccessOnNonExistent?: boolean;
  requireDelayOnError?: boolean;
  customMessage?: {
    userExists?: string;
    userNotFound?: string;
  };
} {
  const config = getRateLimitConfig(purpose);
  return config.validation || { userExists: 'ignore' };
}

// ============================================================
 // ACTIONS THAT DON'T REQUIRE ANY OTP
// ============================================================

export const NO_OTP_ACTIONS = [
  'VIEW_LISTING',
  'SEARCH',
  'VIEW_PROFILE',
  'APPLY_JOB',
  'APPLY_INFORMAL_JOB',
  'RENTAL_INQUIRY',
  'APPLY_AID',
  'REQUEST_QUOTE',
  'BOOK_PROFESSIONAL',
  'VIEW_BOOKING',
  'MESSAGE_USER',
  'CONTACT_SELLER',
  'SAVE_LISTING',
  'SHARE_LISTING',
  'POST_REVIEW',
  'RATE_USER',
  'UPDATE_PROFILE',
  'UPLOAD_PHOTO',
  'UPDATE_BIO',
];

// ============================================================
 // VALIDATION FUNCTION
// ============================================================

export function isValidOtpPurpose(purpose: string): purpose is OtpPurpose {
  return Object.keys(RATE_LIMIT_CONFIGS).includes(purpose);
}