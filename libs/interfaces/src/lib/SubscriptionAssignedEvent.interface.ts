export interface SubscriptionAssignedEvent {
  subscriptionUuid: string;
  userUuid: string;

  planName: string;
  billingCycle: 'monthly' | 'quarterly' | 'halfYearly' | 'annually';
  isPremium: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED';

  assignedByType: 'ADMIN' | 'SYSTEM' | 'USER';
  assignedByUuid?: string; // only when ADMIN or USER

  source:
    | 'ADMIN_ASSIGNMENT'
    | 'USER_UPGRADE'
    | 'USER_SIGNUP';

  assignedAt: string; // ISO date
}
