export interface JwtPayload {
  userUuid: string;
  email: string;
  // User role 
  role: string; 
  /** Optional metadata */
  planId?: string;
  categoryId?: string;
}
