import { join } from 'path';

// Always resolve from project root → dist/libs/protos after build
export const AUTH_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/auth.proto');
export const USER_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/user.proto');
export const RBAC_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/rbac.proto'); 
export const LISTINGS_CATEGORIES_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/categories.proto');
export const LISTINGS_JOBS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/jobs.proto');
export const PLANS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/plans.proto');    
export const SUBSCRIPTIONS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/subscriptions.proto');   
export const PROVIDERS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/providers.proto');
export const NOTIFICATIONS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/notifications.proto'); 
export const PROVIDERS_PRICING_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/providers_pricing.proto');    



