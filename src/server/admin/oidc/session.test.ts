import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  issueAdminOidcSession,
  isAdminOidcSessionCookie,
  verifyAdminOidcSession,
} from "@/src/server/admin/oidc/session";

describe("admin OIDC session", () => {
  it("issues and verifies a signed admin session", () => {
    const token = issueAdminOidcSession({
      id: "oidc:sub-1",
      email: "ops@laduree.th",
      name: "Ops",
      subject: "sub-1",
    });
    assert.equal(isAdminOidcSessionCookie(token), true);
    assert.equal(isAdminOidcSessionCookie("mock-admin"), false);
    const principal = verifyAdminOidcSession(token);
    assert.equal(principal.email, "ops@laduree.th");
    assert.equal(principal.subject, "sub-1");
  });

  it("rejects tampered sessions", () => {
    const token = issueAdminOidcSession({
      id: "oidc:sub-2",
      email: "ops@laduree.th",
      name: "Ops",
      subject: "sub-2",
    });
    assert.throws(() => verifyAdminOidcSession(`${token}x`));
    assert.throws(() => verifyAdminOidcSession("mock-admin"));
  });
});
