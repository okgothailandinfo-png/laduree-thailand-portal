import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMockSavedAddressRepository,
  SAVED_ADDRESS_LABELS,
  savedAddressToDeliveryDraft,
} from "./saved-addresses";

describe("Saved address selection (mock)", () => {
  it("exposes Home, Office, and Other labels", () => {
    assert.deepEqual(SAVED_ADDRESS_LABELS, ["Home", "Office", "Other"]);
  });

  it("lists addresses only for a member email", () => {
    const repo = createMockSavedAddressRepository();
    assert.equal(repo.listForMember(null).length, 0);
    assert.equal(repo.listForMember("").length, 0);
    const listed = repo.listForMember("member@laduree.th");
    assert.equal(listed.length, 3);
    assert.deepEqual(
      listed.map((a) => a.label),
      ["Home", "Office", "Other"],
    );
  });

  it("selects an address by id for checkout drafting", () => {
    const repo = createMockSavedAddressRepository();
    const office = repo.findById("member@laduree.th", "addr-office");
    assert.ok(office);
    assert.equal(office.label, "Office");
    const draft = savedAddressToDeliveryDraft(office);
    assert.equal(draft.postalCode, "10330");
    assert.equal(draft.district, "Pathum Wan");
    assert.equal(draft.building, "Central Office Tower");
  });
});
