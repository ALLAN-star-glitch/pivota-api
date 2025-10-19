export class UserResponseDto {
  id!: string;           // Internal numeric ID (stringified)
  uuid!: string;         // Global unique identifier for internal services
  userCode!: string;     // Custom external identifier (e.g., PIV-000123)
  email!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  createdAt!: string;
  updatedAt!: string;

  // RBAC fields
  roles?: string[];      // e.g., ['RegisteredUser', 'PremiumUser']
  planId?: string;       // Subscription plan ID
  categoryId?: string;   // Service category ID
}
