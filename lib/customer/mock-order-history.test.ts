import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMockOrderStatus,
  formatMockServiceType,
  listMockMemberOrders,
} from "./mock-order-history";

describe("Order history rendering (mock member)", () => {
  it("returns no orders without a member email", () => {
    assert.deepEqual(listMockMemberOrders(null), []);
    assert.deepEqual(listMockMemberOrders(""), []);
  });

  it("renders required fields for each mock order", () => {
    const orders = listMockMemberOrders("member@laduree.th");
    assert.ok(orders.length >= 1);

    for (const order of orders) {
      assert.ok(order.orderNumber);
      assert.ok(order.date);
      assert.ok(formatMockOrderStatus(order.status));
      assert.ok(
        order.serviceType === "PICKUP" || order.serviceType === "DELIVERY",
      );
      assert.ok(
        formatMockServiceType(order.serviceType) === "Pick-up" ||
          formatMockServiceType(order.serviceType) === "Delivery",
      );
      assert.ok(order.paymentMethodLabel);
      assert.ok(order.paymentStatus);
      assert.ok(order.fulfilmentStatus);
      assert.ok(typeof order.totalThb === "number");
      assert.ok(order.detailPath);
      assert.equal(/4242\s*4242\s*4242/.test(JSON.stringify(order)), false);
    }
  });

  it("includes both Pickup and Delivery sample orders", () => {
    const orders = listMockMemberOrders("member@laduree.th");
    const types = new Set(orders.map((o) => o.serviceType));
    assert.ok(types.has("PICKUP"));
    assert.ok(types.has("DELIVERY"));
  });
});
