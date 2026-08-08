/**
 * Customer-facing payment UI state machine.
 * Maps explicitly; never treats unpaid as paid on refresh alone.
 */

export type PaymentUiState =
  | "UNSELECTED"
  | "READY"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type GatewayPaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";

export function paymentUiStateFromMethod(selected: boolean): PaymentUiState {
  return selected ? "READY" : "UNSELECTED";
}

export function paymentUiStateFromGateway(
  status: GatewayPaymentStatus,
): PaymentUiState {
  switch (status) {
    case "PENDING":
      return "PROCESSING";
    case "SUCCESS":
      return "SUCCEEDED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
    case "REFUNDED":
      return "CANCELLED";
    case "EXPIRED":
      return "EXPIRED";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function canAccessOrderConfirmation(state: PaymentUiState): boolean {
  return state === "SUCCEEDED";
}

export function canRetryPayment(state: PaymentUiState): boolean {
  return state === "FAILED" || state === "EXPIRED" || state === "CANCELLED";
}

export function isTerminalPaymentUiState(state: PaymentUiState): boolean {
  return (
    state === "SUCCEEDED" ||
    state === "FAILED" ||
    state === "CANCELLED" ||
    state === "EXPIRED"
  );
}

export function preventsDuplicateSubmission(state: PaymentUiState): boolean {
  return state === "PROCESSING" || state === "SUCCEEDED";
}
