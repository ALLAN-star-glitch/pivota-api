
export class AccessDataDto {
  /**
   * Whether the user has permission to access the module
   */
  isAllowed!: boolean;

  /**
   * JSON string or Record of limits (e.g., { listingLimit: 10 })
   * We use unknown to satisfy the no-explicit-any rule.
   */
  restrictions!: Record<string, unknown> | string;

  /**
   * Optional string explaining why access was denied
   */
  reason?: string;
}