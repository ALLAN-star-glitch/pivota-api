// plan-features.interface.ts
export interface PlanFeatures {
  prices?: {
    monthly?: number;
    quarterly?: number;
    halfYearly?: number;
    annually?: number;
  };
  support?: 'standard' | 'priority' | 'dedicated';
  boost?: boolean;
  analytics?: boolean;
}
