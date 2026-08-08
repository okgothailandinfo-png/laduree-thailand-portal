import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessOrderConfirmation,
  canRetryPayment,
  paymentUiStateFromGateway,
  paymentUiStateFromMethod,
  preventsDuplicateSubmission,
} from "./payment-ui-state";
import {
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_LABELS,
  isPaymentMethodId,
} from "./methods";

describe("payment UI state machine", () => {
  it("starts UNSELECTED until a method is chosen", () => {
    assert.equal(paymentUiStateFromMethod(false), "UNSELECTED");
    assert.equal(paymentUiStateFromMethod(true), "READY");
  });

  it("maps gateway statuses to UI states", () => {
    assert.equal(paymentUiStateFromGateway("PENDING"), "PROCESSING");
    assert.equal(paymentUiStateFromGateway("SUCCESS"), "SUCCEEDED");
    assert.equal(paymentUiStateFromGateway("FAILED"), "FAILED");
    assert.equal(paymentUiStateFromGateway("CANCELLED"), "CANCELLED");
    assert.equal(paymentUiStateFromGateway("EXPIRED"), "EXPIRED");
  });

  it("allows confirmation only after SUCCEEDED", () => {
    assert.equal(canAccessOrderConfirmation("SUCCEEDED"), true);
    assert.equal(canAccessOrderConfirmation("PROCESSING"), false);
    assert.equal(canAccessOrderConfirmation("FAILED"), false);
    assert.equal(canAccessOrderConfirmation("CANCELLED"), false);
  });

  it("allows retry after failed, cancelled, or expired", () => {
    assert.equal(canRetryPayment("FAILED"), true);
    assert.equal(canRetryPayment("CANCELLED"), true);
    assert.equal(canRetryPayment("EXPIRED"), true);
    assert.equal(canRetryPayment("SUCCEEDED"), false);
  });

  it("prevents duplicate submission while processing or succeeded", () => {
    assert.equal(preventsDuplicateSubmission("PROCESSING"), true);
    assert.equal(preventsDuplicateSubmission("SUCCEEDED"), true);
    assert.equal(preventsDuplicateSubmission("READY"), false);
  });
});

describe("approved payment methods", () => {
  it("allows only Credit Card and PromptPay QR", () => {
    assert.deepEqual([...PAYMENT_METHOD_IDS], ["credit-card", "promptpay-qr"]);
    assert.equal(PAYMENT_METHOD_LABELS["credit-card"], "Credit Card");
    assert.equal(PAYMENT_METHOD_LABELS["promptpay-qr"], "PromptPay QR");
    assert.equal(isPaymentMethodId("credit-card"), true);
    assert.equal(isPaymentMethodId("promptpay-qr"), true);
    assert.equal(isPaymentMethodId("apple-pay"), false);
    assert.equal(isPaymentMethodId("google-pay"), false);
  });
});
