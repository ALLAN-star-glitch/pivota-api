export interface JwtPayload {
  userUuid: string;    // The human (e.g., "user_123")
  userName: string;    // Denormalized (e.g., "John Doe")
  
  accountId: string;   // The billing/owner entity (e.g., "acc_456")
  accountName: string; // Denormalized (e.g., "Pivota NGO" or "John Doe")
  
  accountType: "INDIVIDUAL" | "ORGANIZATION"; // Helps UI logic

  email: string;
  role: string;
  organizationUuid?: string;
  planSlug?: string;
}