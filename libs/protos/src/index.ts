import { join } from 'path';

// Always resolve from project root → dist/libs/protos after build
export const AUTH_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/auth.proto');
export const USER_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/user.proto');
export const RBAC_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/rbac.proto'); 
export const LISTINGS_CATEGORIES_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/categories.proto');
export const LISTINGS_JOBS_PROTO_PATH = join(process.cwd(), 'dist/libs/protos/src/lib/jobs.proto');



