import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderDetail } from "@/lib/api/types";
import {
  buildPaymentRecoveryPath,
  canContinuePayment,
  customerSafePaymentError,
  historyItemNeedsPaymentRecovery,
  isOrderAlreadyPaid,
  isRecoverableUnpaidOrder,
} from "./payment-recovery";

function unpaidPickupOrder(
  overrides?: Partial<OrderDetail>,
): OrderDetail {
  return {
    id: "order-1",
    orderNumber: "DRAFT-1",
    status: "pending",
    serviceType: "PICKUP",
    currency: "THB",
    createdAt: new Date().toISOString(),
    totalThb: 1290,
    customer: {
      customerName: "Ada Lovelace",
      mobileNumber: "+66812345678",
      email: "ada@example.com",
    },
    items: [
      {
        productId: "p1",
        name: "Macaron",
        quantity: 1,
        modifiers: [],
      },
    ],
    pickup: {
      boutiqueId: "b1",
      boutiqueName: "Ladurée Thailand",
      address: "Bangkok",
      dateKey: "2026-08-10",
      timeSlotId: "1000",
      timeSlotLabel: "10:00 To 10:30",
    },
    payment: {
      method: "promptpay-qr",
      methodLabel: "PromptPay QR",
      status: "pending",
    },
    ...overrides,
  };
}

describe("Sprint 28 — payment recovery helpers", () => {
  it("treats unpaid pending pickup drafts as recoverable", () => {
    const order = unpaidPickupOrder();
    assert.equal(isRecoverableUnpaidOrder(order), true);
    assert.equal(isOrderAlreadyPaid(order), false);
    assert.equal(
      canContinuePayment({
        orderId: order.id,
        accessToken: "token",
        order,
        sessionReady: false,
      }),
      true,
    );
  });

  it("blocks recovery when payment already succeeded", () => {
    const order = unpaidPickupOrder({
      status: "confirmed",
      payment: {
        method: "promptpay-qr",
        methodLabel: "PromptPay QR",
        status: "mock_accepted",
      },
    });
    assert.equal(isOrderAlreadyPaid(order), true);
    assert.equal(isRecoverableUnpaidOrder(order), false);
    assert.equal(
      canContinuePayment({
        orderId: order.id,
        accessToken: "token",
        order,
        sessionReady: true,
      }),
      false,
    );
  });

  it("blocks cancelled orders even with an intact session", () => {
    const order = unpaidPickupOrder({ status: "cancelled" });
    assert.equal(
      canContinuePayment({
        orderId: order.id,
        accessToken: "token",
        order,
        sessionReady: true,
      }),
      false,
    );
  });

  it("allows a recovered unpaid draft without a client-visible token", () => {
    const order = unpaidPickupOrder();
    assert.equal(
      canContinuePayment({
        orderId: order.id,
        accessToken: null,
        order,
        sessionReady: false,
      }),
      true,
    );
  });

  it("still requires a token when no recoverable server order is loaded", () => {
    assert.equal(
      canContinuePayment({
        orderId: "order-1",
        accessToken: null,
        order: null,
        sessionReady: true,
      }),
      false,
    );
  });

  it("falls back to sessionReady when no recoverable server order", () => {
    assert.equal(
      canContinuePayment({
        orderId: "order-1",
        accessToken: "token",
        order: null,
        sessionReady: true,
      }),
      true,
    );
    assert.equal(
      canContinuePayment({
        orderId: "order-1",
        accessToken: "token",
        order: null,
        sessionReady: false,
      }),
      false,
    );
  });

  it("builds token-preserving payment recovery URLs", () => {
    assert.equal(
      buildPaymentRecoveryPath({
        orderId: "abc/def",
        accessToken: "tok+1",
      }),
      "/payment?orderId=abc%2Fdef&token=tok%2B1",
    );
  });

  it("routes unpaid history rows to payment recovery", () => {
    assert.equal(
      historyItemNeedsPaymentRecovery({
        status: "pending",
        paymentStatus: "pending",
      }),
      true,
    );
    assert.equal(
      historyItemNeedsPaymentRecovery({
        status: "pending",
        paymentStatus: "failed",
      }),
      true,
    );
    assert.equal(
      historyItemNeedsPaymentRecovery({
        status: "confirmed",
        paymentStatus: "mock_accepted",
      }),
      false,
    );
    assert.equal(
      historyItemNeedsPaymentRecovery({
        status: "cancelled",
        paymentStatus: "failed",
      }),
      false,
    );
  });

  it("maps technical failures to customer-safe payment messages", () => {
    assert.equal(
      customerSafePaymentError(new Error("Order already paid.")),
      "Order already paid.",
    );
    assert.equal(
      customerSafePaymentError(new Error("Invalid order access token")),
      "Unable to access this order. Open the order from Order History or return to checkout.",
    );
    assert.equal(
      customerSafePaymentError(new Error("PROVIDER_UNAVAILABLE prisma boom")),
      "Unable to start payment. Please try again.",
    );
    assert.equal(
      customerSafePaymentError(new Error("Failed to fetch")),
      "Connection problem. Please check your network and try again.",
    );
  });
});
