import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthProviderNotImplementedError } from "./auth-provider";
import { createMockAuthProvider } from "./mock-auth-provider";

describe("Authentication provider architecture", () => {
  it("exposes a mock provider id for future replacement", () => {
    const provider = createMockAuthProvider({
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    assert.equal(provider.id, "mock");
  });

  it("keeps LINE Login unimplemented", async () => {
    const provider = createMockAuthProvider({
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    await assert.rejects(
      () => provider.signInWithLine(),
      (error: unknown) =>
        error instanceof AuthProviderNotImplementedError &&
        error.provider === "line",
    );
  });
});
