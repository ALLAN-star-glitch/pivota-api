export interface JwtPayload {
  /** The unique ID of the person (Identity) */
  userUuid: string;
  
  /** The unique ID of the billing entity (Billing Context) */
  accountId: string;

  email: string;

  /** * The user's role in the current context.
   * If they are logged into an Org, this is their Org Role.
   * If logged in as an Individual, this is their Global Role.
   */
  role: string; 

  /** * Optional: The current active subscription plan slug/ID 
   * useful for quick "Plan-Gate" checks without DB hits.
   */
  planSlug?: string;

  /** Optional: If the user is currently acting on behalf of an Org */
  organizationUuid?: string;
}