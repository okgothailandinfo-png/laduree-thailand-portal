import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMockAuthProvider } from "./mock-auth-provider";
import {
  createAnonymousSession,
  createGuestSession,
  createMemberSession,
  CUSTOMER_SESSION_STORAGE_KEY,
  parseStoredSession,
} from "./session";

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe("Customer session switching", () => {
  it("starts anonymous", () => {
    const session = createAnonymousSession();
    assert.equal(session.customerType, "anonymous");
    assert.equal(session.isAuthenticated, false);
    assert.equal(session.email, null);
  });

  it("switches to guest without authentication", () => {
    const auth = createMockAuthProvider(memoryStorage());
    const session = auth.continueAsGuest();
    assert.equal(session.customerType, "guest");
    assert.equal(session.isAuthenticated, false);
    assert.deepEqual(auth.getSession(), createGuestSession());
  });

  it("switches to member after mock email login", async () => {
    const auth = createMockAuthProvider(memoryStorage());
    const session = await auth.signInWithEmail({
      email: "marie@example.com",
      password: "secret",
    });
    assert.equal(session.customerType, "member");
    assert.equal(session.isAuthenticated, true);
    assert.equal(session.email, "marie@example.com");
    assert.equal(session.customerName, "Marie Dupont");
    assert.equal(session.phone, "0812345678");
  });

  it("sign out returns to anonymous and clears storage", async () => {
    const storage = memoryStorage();
    const auth = createMockAuthProvider(storage);
    await auth.signInWithEmail({
      email: "marie@example.com",
      password: "secret",
    });
    assert.ok(storage.getItem(CUSTOMER_SESSION_STORAGE_KEY));
    const signedOut = await auth.signOut();
    assert.equal(signedOut.customerType, "anonymous");
    assert.equal(storage.getItem(CUSTOMER_SESSION_STORAGE_KEY), null);
  });

  it("persists member session across provider instances", async () => {
    const storage = memoryStorage();
    const first = createMockAuthProvider(storage);
    await first.signInWithEmail({
      email: "member@laduree.th",
      password: "x",
    });
    const second = createMockAuthProvider(storage);
    const restored = second.getSession();
    assert.equal(restored.customerType, "member");
    assert.equal(restored.email, "member@laduree.th");
  });

  it("parses stored session JSON", () => {
    const member = createMemberSession("a@b.co");
    const parsed = parseStoredSession(JSON.stringify(member));
    assert.equal(parsed?.customerType, "member");
    assert.equal(parsed?.email, "a@b.co");
    assert.equal(parseStoredSession("not-json"), null);
  });
});
