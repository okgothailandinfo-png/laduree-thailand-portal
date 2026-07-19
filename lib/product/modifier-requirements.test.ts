import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  areRequiredModifierGroupsComplete,
  formatOptionalHint,
  validateRequiredModifierGroups,
} from "./modifier-requirements";

const acknowledgement = {
  id: "pickup-acknowledgement",
  title: "[CONTENT PENDING APPROVAL] Product handling acknowledgement (Pickup)",
  requiredText: "Please select 1",
  type: "radio" as const,
  options: [
    "[CONTENT PENDING APPROVAL] I acknowledge & agree to proceed with my pickup order.",
  ],
  required: true,
  isAcknowledgement: true,
  minSelection: 1,
  maxSelection: 1,
};

const gifting = {
  id: "gifting-ribbon",
  title: "Add a Gifting Ribbon Bow:",
  requiredText: null,
  type: "radio" as const,
  options: ["1 x Gifting Ribbon Bow (M)"],
  required: false,
  maxSelection: 1,
};

const flavours = {
  id: "choice-of-macarons",
  title: "Choice of Macarons:",
  requiredText: "Please select 8",
  type: "quantity" as const,
  options: ["Rose", "Chocolate"],
  exactSelectionQuantity: 8,
  required: true,
};

describe("modifier-requirements", () => {
  it("blocks Add when required acknowledgement is missing", () => {
    const result = validateRequiredModifierGroups(
      [flavours, acknowledgement, gifting],
      [
        { label: "Rose", quantity: 8 },
        { label: "1 x Gifting Ribbon Bow (M)" },
      ],
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "REQUIRED_INCOMPLETE");
      assert.equal(result.groupId, "pickup-acknowledgement");
    }
  });

  it("does not block Add when optional gifting is omitted", () => {
    const complete = areRequiredModifierGroupsComplete(
      [flavours, acknowledgement, gifting],
      [
        { label: "Rose", quantity: 8 },
        {
          label:
            "[CONTENT PENDING APPROVAL] I acknowledge & agree to proceed with my pickup order.",
        },
      ],
    );
    assert.equal(complete, true);
  });

  it("shows optional status with max selection when configured", () => {
    assert.equal(formatOptionalHint(1), "Optional · Max 1");
    assert.equal(formatOptionalHint(null), "Optional");
  });
});
