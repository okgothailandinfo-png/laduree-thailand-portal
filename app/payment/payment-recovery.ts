/**
 * Sprint 28 — payment recovery helpers.
 * Prefer server order snapshots over live cart when retrying unpaid drafts.
 */

import type { OrderDetail, OrderHistoryItem } from "@/lib/api/types";
import { formatFullDeliveryAddressInline } from "../checkout/delivery-address-form";
import {
  buildOrderReviewTotals,
  formatModifiersLabel,
  TRUSTED_TAX_PLACEHOLDER,
  type OrderReviewModel,
} from "../checkout/order-review-model";
import { formatPickupDateKeyLong } from "../pickup/pickup-dates";

export function isOrderAlreadyPaid(
  order: OrderDetail | null | undefined,
): boolean {
  return order?.payment?.status === "mock_accepted";
}

export function isRecoverableUnpaidOrder(
  order: OrderDetail | null | undefined,
): boolean {
  if (!order) return false;
  if (isOrderAlreadyPaid(order)) return false;
  if (order.status === "cancelled" || order.status === "completed") return false;
  if (order.status !== "pending" && order.status !== "mock_placed") return false;
  if (order.serviceType === "PICKUP") return Boolean(order.pickup);
  return Boolean(order.delivery);
}

export function canContinuePayment(input: {
  orderId: string | null | undefined;
  accessToken: string | null | undefined;
  order: OrderDetail | null | undefined;
  /** Classic session path still requires cart + pickup + checkout. */
  sessionReady: boolean;
}): boolean {
  if (!input.orderId || !input.accessToken) return false;
  if (isOrderAlreadyPaid(input.order)) return false;
  if (input.order?.status === "cancelled") return false;
  if (isRecoverableUnpaidOrder(input.order)) return true;
  return input.sessionReady;
}

/** Token-preserving payment reopen URL (UAT recovery). */
export function buildPaymentRecoveryPath(input: {
  orderId: string;
  accessToken: string;
}): string {
  const orderId = encodeURIComponent(input.orderId.trim());
  const token = encodeURIComponent(input.accessToken.trim());
  return `/payment?orderId=${orderId}&token=${token}`;
}

/** History rows that still need payment reopen to `/payment`. */
export function historyItemNeedsPaymentRecovery(
  item: Pick<OrderHistoryItem, "status" | "paymentStatus">,
): boolean {
  if (item.paymentStatus === "mock_accepted") return false;
  if (item.status === "cancelled" || item.status === "completed") return false;
  return item.status === "pending" || item.status === "mock_placed";
}

function deliveryModeLabel(
  mode: "EARLIEST_AVAILABLE" | "PREORDER",
): string {
  return mode === "EARLIEST_AVAILABLE" ? "Earliest Delivery" : "Pre-order";
}

/** Build Order Review from the durable server order (authoritative). */
export function buildOrderReviewFromOrderDetail(
  order: OrderDetail,
): OrderReviewModel {
  const isDelivery = order.serviceType === "DELIVERY";
  const deliveryFeeThb = order.delivery?.feeThb ?? null;
  const itemSubtotalGuess =
    isDelivery && typeof deliveryFeeThb === "number"
      ? order.totalThb - deliveryFeeThb
      : null;

  return {
    serviceType: order.serviceType,
    customer: {
      customerName: order.customer.customerName,
      email: order.customer.email,
      mobileNumber: order.customer.mobileNumber,
    },
    items: order.items.map((item, index) => ({
      id: `${item.productId}-${index}`,
      name: item.name,
      quantity: item.quantity,
      modifiersLabel: formatModifiersLabel(item.modifiers),
    })),
    totals: buildOrderReviewTotals({
      serviceType: order.serviceType,
      subtotalThb: itemSubtotalGuess,
      deliveryFeeThb,
      trustedTotalThb: order.totalThb,
    }),
    taxLabel: TRUSTED_TAX_PLACEHOLDER,
    pickup:
      !isDelivery && order.pickup
        ? {
            boutiqueName: order.pickup.boutiqueName,
            boutiqueAddress: order.pickup.address,
            dateLabel: formatPickupDateKeyLong(order.pickup.dateKey),
            timeLabel: order.pickup.timeSlotLabel,
          }
        : null,
    delivery:
      isDelivery && order.delivery
        ? {
            fullAddress: formatFullDeliveryAddressInline(order.delivery.address),
            modeLabel: deliveryModeLabel(order.delivery.mode),
            dateLabel: order.delivery.dateKey
              ? formatPickupDateKeyLong(order.delivery.dateKey)
              : null,
            windowLabel: order.delivery.timeSlotLabel ?? null,
            notes:
              order.delivery.address.notes?.trim() ||
              order.customer.specialRequest?.trim() ||
              null,
            deliveryFeeThb,
          }
        : null,
  };
}

/** Map API/network failures to customer-safe payment messages. */
export function customerSafePaymentError(
  error: unknown,
  fallback = "Unable to start payment. Please try again.",
): string {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "";

  if (!message) return fallback;

  if (/already paid/i.test(message)) return "Order already paid.";
  if (/access token has expired/i.test(message)) {
    return "This order link has expired. Open the order from Order History or return to checkout.";
  }
  if (/access token|unauthorized|forbidden/i.test(message)) {
    return "Unable to access this order. Open the order from Order History or return to checkout.";
  }
  if (/rate limit|too many|429/i.test(message)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (/network|failed to fetch|timeout|abort/i.test(message)) {
    return "Connection problem. Please check your network and try again.";
  }
  if (/PROVIDER_UNAVAILABLE|internal|stack|ECONN|prisma/i.test(message)) {
    return fallback;
  }

  // Prefer known validation messages from the API; avoid leaking stack-like text.
  if (message.length > 180 || /at\s+\S+\s+\(/.test(message)) {
    return fallback;
  }

  return message;
}
