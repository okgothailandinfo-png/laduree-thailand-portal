import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCheckoutPrefillFromSession } from "./checkout-prefill";
import { createGuestSession, createMemberSession } from "./session";
import { listMockSavedAddresses } from "./saved-addresses";

describe("Prefilled checkout from member session", () => {
  it("does not prefill for guest", () => {
    const prefill = buildCheckoutPrefillFromSession(createGuestSession());
    assert.equal(prefill, null);
  });

  it("prefills name, email, and phone for member", () => {
    const session = createMemberSession("member@laduree.th");
    const prefill = buildCheckoutPrefillFromSession(session);
    assert.ok(prefill);
    assert.equal(prefill.firstName, "Marie");
    assert.equal(prefill.lastName, "Dupont");
    assert.equal(prefill.customerName, "Marie Dupont");
    assert.equal(prefill.email, "member@laduree.th");
    assert.equal(prefill.mobileNumber, "0812345678");
    assert.equal(prefill.deliveryAddress, undefined);
  });

  it("includes delivery address when a saved address is provided", () => {
    const session = createMemberSession("member@laduree.th");
    const home = listMockSavedAddresses(session.email).find(
      (a) => a.label === "Home",
    );
    assert.ok(home);
    const prefill = buildCheckoutPrefillFromSession(session, home);
    assert.ok(prefill?.deliveryAddress);
    assert.equal(prefill.deliveryAddress.postalCode, "10110");
    assert.equal(prefill.deliveryAddress.recipient, "Marie Dupont");
    assert.equal(prefill.deliveryAddress.province, "Bangkok");
  });
});
