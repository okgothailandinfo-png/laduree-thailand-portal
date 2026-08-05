/**
 * Customer session constants and persistence helpers.
 * Persistence is client-local for the mock provider; real providers can
 * replace this with httpOnly cookies / token exchange later.
 */

import {
  ANONYMOUS_SESSION,
  GUEST_SESSION,
  type CustomerSession,
  type CustomerType,
} from "./types";

export const CUSTOMER_SESSION_STORAGE_KEY = "laduree.customer.session.v1";

/** Fixed mock member profile used after successful mock email login. */
export const MOCK_MEMBER_PROFILE = {
  customerName: "Marie Dupont",
  firstName: "Marie",
  lastName: "Dupont",
  phone: "0812345678",
  /** Default email when login does not supply one (tests / seed). */
  email: "member@laduree.th",
} as const;

export function createMemberSession(email: string): CustomerSession {
  const trimmed = email.trim().toLowerCase();
  return {
    customerType: "member",
    customerName: MOCK_MEMBER_PROFILE.customerName,
    firstName: MOCK_MEMBER_PROFILE.firstName,
    lastName: MOCK_MEMBER_PROFILE.lastName,
    phone: MOCK_MEMBER_PROFILE.phone,
    email: trimmed || MOCK_MEMBER_PROFILE.email,
    isAuthenticated: true,
  };
}

export function createGuestSession(): CustomerSession {
  return { ...GUEST_SESSION };
}

export function createAnonymousSession(): CustomerSession {
  return { ...ANONYMOUS_SESSION };
}

export function isCustomerSession(value: unknown): value is CustomerSession {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const type = record.customerType;
  if (type !== "anonymous" && type !== "guest" && type !== "member") {
    return false;
  }
  if (typeof record.isAuthenticated !== "boolean") return false;
  return true;
}

export function parseStoredSession(raw: string | null): CustomerSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isCustomerSession(parsed)) return null;
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

export function normalizeSession(session: CustomerSession): CustomerSession {
  if (session.customerType === "member" && session.isAuthenticated) {
    return {
      customerType: "member",
      customerName: session.customerName ?? MOCK_MEMBER_PROFILE.customerName,
      firstName: session.firstName ?? MOCK_MEMBER_PROFILE.firstName,
      lastName: session.lastName ?? MOCK_MEMBER_PROFILE.lastName,
      phone: session.phone ?? MOCK_MEMBER_PROFILE.phone,
      email: session.email ?? MOCK_MEMBER_PROFILE.email,
      isAuthenticated: true,
    };
  }
  if (session.customerType === "guest") {
    return createGuestSession();
  }
  return createAnonymousSession();
}

export function readSessionFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined,
): CustomerSession {
  if (!storage) return createAnonymousSession();
  try {
    const parsed = parseStoredSession(
      storage.getItem(CUSTOMER_SESSION_STORAGE_KEY),
    );
    return parsed ?? createAnonymousSession();
  } catch {
    return createAnonymousSession();
  }
}

export function writeSessionToStorage(
  storage: Pick<Storage, "setItem" | "removeItem"> | null | undefined,
  session: CustomerSession,
): void {
  if (!storage) return;
  try {
    if (session.customerType === "anonymous") {
      storage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
      return;
    }
    storage.setItem(CUSTOMER_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota / private mode — session remains in-memory only.
  }
}

export function sessionCustomerType(session: CustomerSession): CustomerType {
  return session.customerType;
}
