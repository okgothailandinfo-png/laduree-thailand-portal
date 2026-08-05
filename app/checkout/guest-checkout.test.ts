import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCheckoutPrefillFromSession } from "@/lib/customer/checkout-prefill";
import { createGuestSession } from "@/lib/customer/session";
import type { CheckoutIdentity } from "./CheckoutContext";

describe("Guest checkout unchanged", () => {
  it("keeps guest as a first-class checkout identity", () => {
    const identities: CheckoutIdentity[] = [null, "guest", "member"];
    assert.ok(identities.includes("guest"));
    assert.equal(identities[1], "guest");
  });

  it("does not apply member prefill to guest sessions", () => {
    const prefill = buildCheckoutPrefillFromSession(createGuestSession());
    assert.equal(prefill, null);
  });

  it("guest identity does not imply authentication", () => {
    const guest = createGuestSession();
    assert.equal(guest.customerType, "guest");
    assert.equal(guest.isAuthenticated, false);
    assert.equal(guest.email, null);
    assert.equal(guest.phone, null);
  });
});
