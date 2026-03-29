// libs/decorators/src/lib/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark an endpoint as publicly accessible.
 * When applied, the PermissionsGuard will bypass all authentication and permission checks.
 * 
 * @example
 * @Public()
 * @Get('public-endpoint')
 * getPublicData() {
 *   return { message: 'Anyone can access this' };
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);