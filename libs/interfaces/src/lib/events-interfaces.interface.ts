
export interface InvitationAcceptedNewUserEventPayload {
  email: string;
  userUuid: string;
  organizationUuid: string;
  organizationName: string;
  roleName: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface InvitationAcceptedExistingUserEventPayload {
  email: string;
  userUuid: string;
  organizationUuid: string;
  organizationName: string;
  roleName: string;
  addedByUserUuid: string;
}

export interface PasswordSetupRequiredEventPayload {
  email: string;
  userUuid: string;
  firstName: string;
  setupToken: string;
  expiresAt: string;
  organizationName: string;
}

export interface PasswordSetupCompletedEventPayload {
  email: string;
  userUuid: string;
}

// Union type for all possible invitation event payloads
export type InvitationEventPayload = 
  | InvitationAcceptedNewUserEventPayload
  | InvitationAcceptedExistingUserEventPayload
  | PasswordSetupRequiredEventPayload
  | PasswordSetupCompletedEventPayload;

export interface InvitationErrorEventPayload {
  originalEvent: string;
  error: string;
  payload: InvitationEventPayload; // Now properly typed instead of any
  timestamp?: string;
}

// For events that might have unknown structure (but still typed)
export interface UnknownEventPayload {
  pattern: string;
  data: Record<string, unknown>;
}