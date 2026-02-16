import { join } from 'path';

// Always resolve from project root → dist/libs/protos after build
export const AUTH_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/auth.proto');
export const PROFILE_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/profile.proto');
export const RBAC_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/rbac.proto'); 
export const LISTINGS_CATEGORIES_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/categories.proto');
export const LISTINGS_JOBS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/jobs.proto');
export const PLANS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/plans.proto');    
export const SUBSCRIPTIONS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/subscriptions.proto');   
export const CONTRACTORS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/contractors.proto');
export const NOTIFICATIONS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/notifications.proto'); 
export const CONTRACTORS_PRICING_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/contractors_pricing.proto');   
export const LISTINGS_HOUSING_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/housing.proto');    
export const LISTINGS_SUPPORT_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/social_support.proto');        
export const LISTINGS_REGISTRY_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/listings_registry.proto');
