/** Admin authentication — OIDC production architecture (separate from customer auth). */

export type AdminAuthProviderName = "mock" | "oidc";

export type AdminPrincipal = {
  id: string;
  email: string;
  name: string;
  /** Identity provider subject (OIDC `sub`) when available. */
  subject?: string;
};

export type AdminOidcConfig = {
  issuer: string;
  clientId: string;
  /** Server-only — never expose to client bundles. */
  clientSecret: string;
  redirectUri: string;
  /** Optional space-separated scopes (default: openid email profile). */
  scopes: string;
};

export interface AdminAuthProvider {
  readonly name: AdminAuthProviderName;
  validateConfiguration(): Promise<{ ok: boolean; message?: string }>;
  /**
   * Resolve the authenticated admin principal from the session cookie.
   * Throws UNAUTHORIZED when missing/invalid.
   */
  requirePrincipal(sessionValue: string | undefined | null): Promise<AdminPrincipal>;
  /** OIDC authorization URL (oidc only). */
  buildAuthorizationUrl?(state: string): string;
}
