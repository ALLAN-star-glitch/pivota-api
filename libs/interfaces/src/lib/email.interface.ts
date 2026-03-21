

export interface EmailColors {
  primary: string;
  secondary: string;
  tertiary: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  neutral: string;
  neutralVariant: string;
  surface: string;
  background: string;
  surfaceVariant: string;
  onPrimary: string;
  onSecondary: string;
  onTertiary: string;
  onError: string;
  onSuccess: string;
  onWarning: string;
  onInfo: string;
  onSurface: string;
  onBackground: string;
  textPrimary: string;
  textSecondary: string;
  textHint: string;
  borderLight: string;
  borderMedium: string;
}

export interface SocialLinks {
  twitter: string;
  linkedin: string;
  facebook: string;
  instagram: string;
  website: string;
}

// Auth Email DTOs
export interface UserWelcomeData {
  email: string;
  firstName: string;
  accountId: string;
  plan?: string;
}

export interface OrganizationWelcomeData {
  adminEmail: string;
  adminFirstName: string;
  orgEmail?: string;
  name: string;
  accountId: string;
  plan?: string;
}

export interface LoginAlertData {
  to: string;
  firstName: string;
  lastName?: string;
  organizationName?: string;
  orgEmail?: string;
  device?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
  isBot?: boolean;
  timestamp?: string;
}

export interface OtpData {
  email: string;
  code: string;
  purpose: string;
}

// Property Email DTOs
export interface ViewingScheduledData {
  email: string;
  firstName: string;
  houseTitle: string;
  houseImageUrl?: string;
  viewingDate: string;
  location: string;
  notes?: string;
}

export interface ViewingRequestData {
  email: string;
  ownerName: string;
  houseTitle: string;
  houseImageUrl?: string;
  viewingDate: string;
  location: string;
  viewerName: string;
  viewerEmail?: string;
  notes?: string;
}

export interface ListingCreatedData {
  email: string;
  firstName: string;
  listingTitle: string;
  listingId: string;
  listingUrl: string;
  listingPrice: number;
  locationCity: string;
  listingType: string;
  status: string;
  imageUrl?: string;
}

// Invitation Email DTOs
export interface InvitationData {
  email: string;
  organizationName: string;
  inviterName: string;
  inviteToken: string;
  message?: string;
  roleName: string;
}

export interface PasswordSetupData {
  email: string;
  firstName: string;
  setupToken: string;
  organizationName: string;
  expiresAt: string;
}

export interface AdminInvitationAcceptedData {
  adminEmail: string;
  adminName: string;
  newMemberEmail: string;
  newMemberName: string;
  organizationName: string;
}

// Payment Email DTOs
export interface PaymentRequiredData {
  email: string;
  firstName: string;
  plan: string;
  redirectUrl: string;
}

export interface PaymentConfirmedData {
  email: string;
  firstName: string;
  plan: string;
  accountId: string;
}

// Admin Notification DTOs
export interface AdminNewUserData {
  recipientEmail: string;
  userEmail: string;
  userName: string;
  accountType: string;
  registrationMethod?: string;
  registrationDate: string;
  userCount?: number;
  plan: string;
}

export interface AdminNewOrganizationData {
  recipientEmail: string;
  organizationName: string;
  adminName: string;
  adminEmail: string;
  organizationEmail: string;
  registrationDate: string;
  plan: string;
}

export interface ListingMilestoneData {
  recipientEmail: string;
  accountName: string;
  listingTitle: string;
  listingPrice: number;
  locationCity: string;
  milestone: number;
  milestoneTier: string;
  suggestedTeam: string;
  totalValue: number;
  averagePrice: number;
  message: string;
  priority: string;
  listingUrl: string;
  accountDashboardUrl: string;
  timestamp: string;
}