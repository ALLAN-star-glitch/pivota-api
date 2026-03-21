// apps/notification-service/src/email/constants/email.constants.ts

export const EMAIL_COLORS = {
  // Core Colors (Material Roles)
  primary: '#1B4B6C',      // African Sapphire - 60% of UI
  secondary: '#C95D3A',    // Warm Terracotta - 30% of UI
  tertiary: '#E6B422',     // Baobab Gold - 10% of UI
  
  // Supporting Colors
  error: '#BA2D2D',        // Sunset Red
  success: '#2E7D32',      // Forest Green
  warning: '#ED6C02',      // Harvest Amber
  info: '#0288D1',         // Ocean Blue
  neutral: '#5D6A75',      // Warm Gray
  neutralVariant: '#D9CFC1', // Soft Sand
  
  // Surface Colors
  surface: '#FFFFFF',
  background: '#F5F5F5',
  surfaceVariant: '#F9F7F3',
  
  // On Colors
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onTertiary: '#1B4B6C',
  onError: '#FFFFFF',
  onSuccess: '#FFFFFF',
  onWarning: '#1B1B1B',
  onInfo: '#FFFFFF',
  onSurface: '#1B1B1B',
  onBackground: '#1B1B1B',
  
  // Text Colors
  textPrimary: '#1B1B1B',
  textSecondary: '#5D6A75',
  textHint: '#9CA3AF',
  
  // Border Colors
  borderLight: '#E5E7EB',
  borderMedium: '#D1D5DB',
} as const;

export const SOCIAL_LINKS = {
  twitter: 'https://twitter.com/pivotaconnect',
  linkedin: 'https://linkedin.com/company/pivotaconnect',
  facebook: 'https://facebook.com/pivotaconnect',
  instagram: 'https://instagram.com/pivotaconnect',
  website: 'https://pivotaconnect.com',
} as const;

export const EMAIL_SUBJECTS = {
  // Auth Emails
  USER_WELCOME: 'Welcome to PivotaConnect',
  ORGANIZATION_WELCOME: 'Welcome to PivotaConnect',
  LOGIN_ALERT: 'New Login Detected',
  ADMIN_LOGIN_ALERT: 'Security Alert: Admin Login',
  OTP_SIGNUP: 'Confirm Your Registration',
  OTP_PASSWORD_RESET: 'Reset Your Password',
  OTP_2FA: 'Two-Factor Authentication Code',
  PASSWORD_SETUP: 'Set Up Your Password',
  PASSWORD_SETUP_CONFIRM: 'Password Setup Complete',
  ACCOUNT_LINKED: 'Account Linked Successfully',
  GOOGLE_WELCOME: 'Welcome to PivotaConnect',
  
  // Organization Emails
  INVITATION_NEW_USER: 'Join {{organizationName}} on PivotaConnect',
  INVITATION_EXISTING_USER: 'Added to {{organizationName}} on PivotaConnect',
  INVITATION_ACCEPTED: '{{newMemberName}} joined {{organizationName}}',
  
  // Property Emails
  VIEWING_CONFIRMED: 'Viewing Confirmed: {{houseTitle}}',
  VIEWING_SCHEDULED: 'Viewing Scheduled: {{houseTitle}}',
  VIEWING_REQUEST: 'New Viewing Request: {{houseTitle}}',
  LISTING_CREATED: 'Your listing "{{listingTitle}}" is now live on PivotaConnect',
  
  // Payment Emails
  PAYMENT_REQUIRED: 'Complete Payment for {{plan}} Plan',
  PAYMENT_CONFIRMED: 'Payment Confirmed: {{plan}} Plan Activated',
  
  // Admin Emails
  ADMIN_NEW_USER: 'New User Registration: {{userName}}',
  ADMIN_NEW_ORGANIZATION: 'New Organization: {{organizationName}}',
  LISTING_MILESTONE: 'Listing Milestone: {{milestone}} Listings',
} as const;