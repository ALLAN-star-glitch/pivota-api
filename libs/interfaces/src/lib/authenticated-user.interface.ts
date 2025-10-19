
/**
 * Represents an authenticated user attached to request context after JWT validation.
 * Tokens are deliberately omitted for security reasons.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string | string[];
  permissions?: string[];
}
