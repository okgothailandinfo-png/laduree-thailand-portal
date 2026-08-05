import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLoginValid,
  isValidLoginEmail,
  validateLoginFields,
} from "./login-validation";

describe("Member login validation", () => {
  it("requires email", () => {
    const errors = validateLoginFields({ email: "", password: "secret" });
    assert.equal(errors.email, "Email is required.");
    assert.equal(isLoginValid({ email: "", password: "secret" }), false);
  });

  it("rejects invalid email format", () => {
    const errors = validateLoginFields({
      email: "not-an-email",
      password: "secret",
    });
    assert.equal(errors.email, "Email format is invalid.");
    assert.equal(isValidLoginEmail("not-an-email"), false);
    assert.equal(isValidLoginEmail("member@laduree.th"), true);
  });

  it("requires password", () => {
    const errors = validateLoginFields({
      email: "member@laduree.th",
      password: "   ",
    });
    assert.equal(errors.password, "Password is required.");
  });

  it("accepts valid email and password", () => {
    const errors = validateLoginFields({
      email: "member@laduree.th",
      password: "password",
    });
    assert.deepEqual(errors, {});
    assert.equal(
      isLoginValid({ email: "member@laduree.th", password: "password" }),
      true,
    );
  });
});
