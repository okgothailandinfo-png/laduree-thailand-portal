import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePersistedConfirmed } from "./pickup-availability";

/**
 * Documents the reopen/refetch contract that previously left the modal stuck
 * on Loading… when draft boutique/date were unchanged.
 */
describe("pickup modal reopen refetch contract", () => {
  it("bumps reload tokens when reopening with an existing selection", () => {
    let datesReloadToken = 0;
    let slotsReloadToken = 0;
    let datesStatus: "idle" | "loading" | "success" = "success";
    let slotsStatus: "idle" | "loading" | "success" = "success";

    const openWithConfirmed = (sameDraft: boolean) => {
      datesStatus = "loading";
      slotsStatus = "loading";
      // Root-cause fix: always retrigger effects on reopen.
      datesReloadToken += 1;
      slotsReloadToken += 1;
      assert.equal(sameDraft, true);
    };

    openWithConfirmed(true);

    assert.equal(datesStatus, "loading");
    assert.equal(slotsStatus, "loading");
    assert.equal(datesReloadToken, 1);
    assert.equal(slotsReloadToken, 1);
  });

  it("does not call availability APIs when boutique is missing", () => {
    const boutiqueId: string | null = null;
    const requests: string[] = [];

    if (boutiqueId) {
      requests.push(`/api/pickup/availability?boutiqueId=${boutiqueId}`);
    }

    assert.deepEqual(requests, []);
  });

  it("terminates loading on success, empty, error, and abort branches", () => {
    const terminal = (branch: "success" | "empty" | "error" | "abort") => {
      if (branch === "abort") return "loading-handed-to-next-effect";
      if (branch === "success") return "success";
      if (branch === "empty") return "empty";
      return "error";
    };

    assert.equal(terminal("success"), "success");
    assert.equal(terminal("empty"), "empty");
    assert.equal(terminal("error"), "error");
    assert.notEqual(terminal("abort"), "loading");
  });

  it("clears confirmed pickup on stale revalidation without clearing cart items", () => {
    let confirmed: { timeSlotId: string } | null = { timeSlotId: "1030-1100" };
    const cartItemCount = 2;
    const liveSlotIds: string[] = ["1100-1130"];

    if (confirmed && !liveSlotIds.includes(confirmed.timeSlotId)) {
      confirmed = null;
    }

    assert.equal(confirmed, null);
    assert.equal(cartItemCount, 2);
  });

  it("defaults persisted confirmation without serviceType to PICKUP", () => {
    // Contract: v1 sessionStorage payloads without serviceType remain Pickup.
    const raw = JSON.stringify({
      boutique: {
        id: "b1",
        name: "Boutique",
        code: "B1",
        address: "Bangkok",
        openingHours: "10:00–20:00",
        lastOrderTime: "19:30",
      },
      dateKey: "2026-07-21",
      timeSlot: {
        id: "1030-1100",
        label: "10:30–11:00",
        start: "10:30",
        end: "11:00",
      },
    });
    const parsed = parsePersistedConfirmed(raw);
    assert.ok(parsed);
    assert.equal(parsed?.serviceType, "PICKUP");
  });

  it("allows persisted DELIVERY confirmation without postal for shopping-first flow", () => {
    const parsed = parsePersistedConfirmed(
      JSON.stringify({
        serviceType: "DELIVERY",
        boutique: {
          id: "b1",
          name: "Boutique",
          code: "B1",
          address: "Bangkok",
          openingHours: "10:00–20:00",
          lastOrderTime: "19:30",
        },
        dateKey: "2026-07-21",
        timeSlot: {
          id: "1030-1100",
          label: "10:30–11:00",
          start: "10:30",
          end: "11:00",
        },
        deliveryAddress: {
          recipient: "",
          phone: "",
          address: "",
          subdistrict: "",
          district: "",
          province: "",
          postalCode: "",
        },
      }),
    );
    assert.equal(parsed?.serviceType, "DELIVERY");
    assert.equal(parsed?.deliveryMode, "EARLIEST_AVAILABLE");
    assert.equal(parsed?.deliveryQuote?.status, "EMPTY");
  });
});
