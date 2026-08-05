/**
 * Swappable customer authentication provider contract.
 *
 * Current implementation: mock (email/password + guest).
 * Future providers (LINE Login, OAuth, OTP) implement the same surface
 * without changing CustomerSession consumers.
 */

import type { CustomerSession } from "./types";

export type CustomerAuthProviderId = "mock" | "line" | "oauth" | "otp";

export type EmailPasswordCredentials = {
  email: string;
  password: string;
};

export type CustomerAuthProvider = {
  readonly id: CustomerAuthProviderId;

  /** Restore session from the provider's persistence layer. */
  getSession(): CustomerSession;

  /** Persist / replace the active session. */
  setSession(session: CustomerSession): void;

  /**
   * Member email/password sign-in.
   * Mock: validates format only; real providers verify credentials remotely.
   */
  signInWithEmail(
    credentials: EmailPasswordCredentials,
  ): Promise<CustomerSession>;

  /** Explicit guest checkout identity (not authenticated). */
  continueAsGuest(): CustomerSession;

  signOut(): Promise<CustomerSession>;

  /**
   * LINE Login placeholder — must remain unimplemented until a real SDK
   * is approved. Callers should keep the UI disabled.
   */
  signInWithLine(): Promise<CustomerSession>;
};

export class AuthProviderNotImplementedError extends Error {
  readonly provider: CustomerAuthProviderId;

  constructor(provider: CustomerAuthProviderId, message?: string) {
    super(
      message ??
        `${provider} authentication is not implemented. Production Blocker.`,
    );
    this.name = "AuthProviderNotImplementedError";
    this.provider = provider;
  }
}
