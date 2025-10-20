export class UserResponseDto {
  // Core user fields
  id!: string;           // Internal numeric ID (stringified)
  uuid!: string;         // Global unique identifier for internal services
  userCode!: string;     // Custom external identifier (e.g., PIV-000123)
  email!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  profileImage?: string; // optional profile picture
  status!: string;       // active, banned, pending
  createdAt!: string;
  updatedAt!: string;

  // Dynamic / runtime fields (populated from other services)
  role?: string;               // single role fetched from admin-service
  currentSubscription?: string; // plan name from payment-service
  subscriptionStatus?: string;  // active, pending, expired
  subscriptionExpiresAt?: string; // optional expiry date
  planId?: string;             // Subscription plan ID
  categoryId?: string;         // Service category ID
}
