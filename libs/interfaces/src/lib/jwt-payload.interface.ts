export interface JwtPayload {
  userUuid: string;
  email: string;
  // User roles (can be single or multiple)
  role: string; 
  /** Optional metadata */
  planId?: string;
  categoryId?: string;
}
