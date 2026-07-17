/** Mock admin session only — no real auth provider. */

export const ADMIN_SESSION_COOKIE = "laduree_admin_session";

/** Dev-only mock value. Not a secret credential. */
export const MOCK_ADMIN_SESSION_VALUE = "mock-admin";

export const MOCK_ADMIN_USER = {
  id: "admin-mock",
  name: "Admin",
  email: "admin@laduree.th",
} as const;

export function isMockAdminSession(
  value: string | undefined | null,
): boolean {
  return value === MOCK_ADMIN_SESSION_VALUE;
}
