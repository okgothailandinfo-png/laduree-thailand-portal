import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeConfiguredUnitPriceMinor,
  formatOptionPriceLabel,
  sumApprovedAddonPriceMinor,
} from "./modifier-pricing";

const groups = [
  {
    id: "gifting-ribbon",
    options: ["1 x Gifting Ribbon Bow (M)"],
    optionDetails: [
      {
        label: "1 x Gifting Ribbon Bow (M)",
        priceMinor: 5000,
        isActive: true,
      },
    ],
  },
  {
    id: "packing-options",
    options: ["+2 Ice Packs (+2 hrs)"],
    optionDetails: [
      {
        label: "+2 Ice Packs (+2 hrs)",
        priceMinor: null,
        isActive: true,
      },
    ],
  },
];

describe("modifier-pricing", () => {
  it("affects subtotal only when an approved add-on price exists", () => {
    const withApproved = sumApprovedAddonPriceMinor(groups, [
      { label: "1 x Gifting Ribbon Bow (M)" },
      { label: "+2 Ice Packs (+2 hrs)", quantity: 1 },
    ]);
    assert.equal(withApproved, 5000);

    const unit = computeConfiguredUnitPriceMinor(99000, groups, [
      { label: "1 x Gifting Ribbon Bow (M)" },
    ]);
    assert.equal(unit, 104000);
  });

  it("ignores add-ons without approved prices", () => {
    const total = sumApprovedAddonPriceMinor(groups, [
      { label: "+2 Ice Packs (+2 hrs)", quantity: 1 },
    ]);
    assert.equal(total, 0);
    assert.equal(formatOptionPriceLabel(null), "฿ —");
  });

  it("keeps base price when no priced add-ons are selected", () => {
    assert.equal(computeConfiguredUnitPriceMinor(99000, groups, []), 99000);
    assert.equal(computeConfiguredUnitPriceMinor(null, groups, []), null);
  });
});
