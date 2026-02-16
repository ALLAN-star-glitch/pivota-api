import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark an endpoint as publicly accessible.
 * When applied, the RolesGuard will bypass permission checks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);