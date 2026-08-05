/**
 * Mock customer auth provider.
 *
 * - Email/password: format validation only; any valid pair creates a member session.
 * - Guest: non-authenticated guest identity.
 * - LINE: explicitly not implemented (placeholder for future SDK).
 *
 * Replace by registering a different CustomerAuthProvider implementation.
 */

import {
  AuthProviderNotImplementedError,
  type CustomerAuthProvider,
  type EmailPasswordCredentials,
} from "./auth-provider";
import { validateLoginFields } from "./login-validation";
import {
  createAnonymousSession,
  createGuestSession,
  createMemberSession,
  readSessionFromStorage,
  writeSessionToStorage,
} from "./session";
import type { CustomerSession } from "./types";

export type MockAuthStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export function createMockAuthProvider(
  storage?: MockAuthStorage | null,
): CustomerAuthProvider {
  const resolveStorage = (): MockAuthStorage | null => {
    if (storage !== undefined) return storage;
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  return {
    id: "mock",

    getSession() {
      return readSessionFromStorage(resolveStorage());
    },

    setSession(session: CustomerSession) {
      writeSessionToStorage(resolveStorage(), session);
    },

    async signInWithEmail(credentials: EmailPasswordCredentials) {
      const errors = validateLoginFields(credentials);
      if (Object.keys(errors).length > 0) {
        const message =
          errors.email ?? errors.password ?? "Unable to sign in.";
        throw new Error(message);
      }
      const session = createMemberSession(credentials.email);
      writeSessionToStorage(resolveStorage(), session);
      return session;
    },

    continueAsGuest() {
      const session = createGuestSession();
      writeSessionToStorage(resolveStorage(), session);
      return session;
    },

    async signOut() {
      const session = createAnonymousSession();
      writeSessionToStorage(resolveStorage(), session);
      return session;
    },

    async signInWithLine() {
      throw new AuthProviderNotImplementedError(
        "line",
        "Continue with LINE is a placeholder. Real LINE Login is out of scope.",
      );
    },
  };
}

/** Default singleton for the browser storefront. */
export const mockCustomerAuthProvider = createMockAuthProvider();
