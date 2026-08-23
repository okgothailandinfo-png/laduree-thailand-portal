import type {
  ConfirmPaymentRequestDto,
  ConfirmPaymentResponseDto,
  CreatePaymentRequestDto,
  CreatePaymentResult,
  PaymentRecordDto,
  PaymentStatus,
} from "@/src/server/payment/dto";
import { createPaymentProvider } from "@/src/server/payment/factory";
import type { PaymentProvider } from "@/src/server/payment/interfaces";
import {
  canApplyPaymentOrderStatus,
  isSafeToCancelOrder,
  orderStatusFromPaymentStatus,
  toApiOrderStatus,
} from "@/src/server/payment/status-mapping";
import {
  MOCK_PAYMENT_WEBHOOK_EVENT_TYPES,
  paymentStatusFromWebhookEvent,
  type MockPaymentWebhookEventDto,
  type MockPaymentWebhookEventType,
} from "@/src/server/payment/webhook/types";
import { verifyWebhookSignature } from "@/src/server/payment/webhook/verify";
import type { NotificationOrchestrator } from "@/src/server/notifications/orchestrator";
import { appendAccessTokenToUrl } from "@/src/server/orders/append-access-token";
import {
  extractOrderAccessToken,
  verifyOrderAccessToken,
} from "@/src/server/orders/order-access-token";
import {
  createFinalOrderNumber,
  isDraftOrderNumber,
} from "@/src/server/orders/order-number";
import type { PickupVerificationService } from "@/src/server/pickup/pickup-verification.service";
import type { OrderRepository } from "@/src/server/repositories/interfaces";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";
import { AppError } from "@/src/server/utils/errors";
import { assertPublicPreviewCheckoutPaymentAllowed } from "@/src/server/preview/commerce-guard";
import { logger } from "@/src/server/utils/logger";
import { minorToMajor } from "@/src/server/utils/money";
import {
  requireObject,
  requireString,
} from "@/src/server/utils/validation";
import { MOCK_PAYMENT_EXPIRY_MS } from "@/lib/payment/mock-config";
import {
  isPaymentMethodId,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/payment/methods";

const CONFIRM_RESULTS = new Set(["SUCCESS", "FAILED"]);

function paymentAccessDenied(): AppError {
  return new AppError("UNAUTHORIZED", "Invalid order access token.", {
    status: 401,
  });
}

export type WebhookApplyResult = {
  eventId: string;
  duplicate: boolean;
  paymentId: string;
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: ReturnType<typeof toApiOrderStatus>;
};

function orderPaymentStatusFromGateway(
  status: PaymentStatus,
): "pending" | "mock_accepted" | "failed" {
  if (status === "SUCCESS") return "mock_accepted";
  if (status === "FAILED") return "failed";
  return "pending";
}

export class PaymentService {
  private readonly provider: PaymentProvider;

  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
    private readonly webhookEvents: WebhookEventRepository,
    private readonly webhookSecret: string,
    private readonly webhookToleranceSeconds: number,
    provider?: PaymentProvider,
    private readonly pickupVerifications?: PickupVerificationService,
    private readonly notifications?: NotificationOrchestrator,
    /** Clears the source cart after durable payment SUCCESS (idempotent). */
    private readonly clearSourceCart?: (cartId: string) => Promise<void>,
  ) {
    this.provider = provider ?? createPaymentProvider(payments, "mock");
  }

  parseCreatePaymentBody(raw: unknown): CreatePaymentRequestDto {
    const body = requireObject(raw, "body");
    const methodRaw = requireString(body.method, "method");
    if (!isPaymentMethodId(methodRaw)) {
      throw new AppError("VALIDATION_ERROR", "payment method is invalid.", {
        details: { field: "method" },
      });
    }
    let safeDisplay: string | null = null;
    if (body.safeDisplay !== undefined && body.safeDisplay !== null) {
      if (typeof body.safeDisplay !== "string") {
        throw new AppError(
          "VALIDATION_ERROR",
          "safeDisplay must be a string.",
          { details: { field: "safeDisplay" } },
        );
      }
      const trimmed = body.safeDisplay.trim();
      // Reject anything that looks like a full PAN or CVV.
      if (/\d{13,}/.test(trimmed.replace(/\s/g, ""))) {
        throw new AppError(
          "VALIDATION_ERROR",
          "safeDisplay must not include a full card number.",
          { details: { field: "safeDisplay" } },
        );
      }
      safeDisplay = trimmed || null;
    }
    const accessToken =
      typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    if (!accessToken) {
      throw new AppError(
        "UNAUTHORIZED",
        "Order access token is required to create a payment.",
        { status: 401, details: { field: "accessToken" } },
      );
    }
    return {
      orderId: requireString(body.orderId, "orderId"),
      method: methodRaw,
      safeDisplay,
      accessToken,
    };
  }

  /**
   * Resolve capability token from parsed body and/or request headers/query.
   * Body wins when present (create payload); otherwise header/query.
   */
  resolveAccessToken(
    request: Request,
    bodyToken?: string | null,
  ): string {
    const fromBody = bodyToken?.trim() ?? "";
    if (fromBody) return fromBody;
    const fromRequest = extractOrderAccessToken(request);
    if (fromRequest) return fromRequest;
    throw new AppError(
      "UNAUTHORIZED",
      "Order access token is required.",
      { status: 401 },
    );
  }

  assertOrderAccessToken(orderId: string, accessToken: string): string {
    verifyOrderAccessToken(accessToken, orderId, "order");
    return accessToken.trim();
  }

  parseConfirmPaymentBody(raw: unknown): ConfirmPaymentRequestDto {
    const body = requireObject(raw, "body");
    const paymentId = requireString(body.paymentId, "paymentId");
    const result = requireString(body.result, "result");
    if (!CONFIRM_RESULTS.has(result)) {
      throw new AppError(
        "VALIDATION_ERROR",
        'result must be "SUCCESS" or "FAILED".',
        { details: { field: "result" } },
      );
    }
    return {
      paymentId,
      result: result as ConfirmPaymentRequestDto["result"],
    };
  }

  parseMockWebhookEvent(raw: unknown): MockPaymentWebhookEventDto {
    const body = requireObject(raw, "body");
    const eventId = requireString(body.eventId, "eventId");
    const type = requireString(body.type, "type");
    if (
      !MOCK_PAYMENT_WEBHOOK_EVENT_TYPES.includes(
        type as MockPaymentWebhookEventType,
      )
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Unsupported webhook event type: ${type}`,
        { details: { field: "type" } },
      );
    }
    const paymentId = requireString(body.paymentId, "paymentId");
    if (
      typeof body.timestamp !== "number" ||
      !Number.isFinite(body.timestamp)
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "timestamp must be a unix epoch number.",
        { details: { field: "timestamp" } },
      );
    }
    return {
      eventId,
      type: type as MockPaymentWebhookEventType,
      paymentId,
      timestamp: body.timestamp,
    };
  }

  async createPayment(
    input: CreatePaymentRequestDto,
  ): Promise<CreatePaymentResult> {
    assertPublicPreviewCheckoutPaymentAllowed();
    const id = requireString(input.orderId, "orderId");
    const accessToken = this.assertOrderAccessToken(id, input.accessToken);
    const method: PaymentMethodId = input.method;
    const order = await this.orders.findById(id);
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found.");
    }
    if (
      order.status === "confirmed" ||
      order.payment?.status === "mock_accepted"
    ) {
      throw new AppError("VALIDATION_ERROR", "Order is already paid.", {
        details: { field: "orderId", status: order.status },
      });
    }

    // Prefer explicit PENDING lookup (survives concurrent creates / mapping races).
    const existing =
      (await this.payments.findPendingByOrderId(id)) ??
      (await this.payments.findByOrderId(id));
    if (existing && existing.status === "PENDING") {
      if (existing.method === method) {
        await this.orders.attachPayment(id, {
          method: existing.method,
          methodLabel: existing.methodLabel,
          status: "pending",
          safeDisplay: existing.safeDisplay,
        });
        return {
          paymentId: existing.paymentId,
          paymentUrl: appendAccessTokenToUrl(existing.paymentUrl, accessToken),
          status: "PENDING",
          method: existing.method,
          methodLabel: existing.methodLabel,
          accessToken,
          orderNumber: order.orderNumber,
        };
      }
      await this.provider.applyStatus(existing.paymentId, "CANCELLED");
    }

    const created = await this.provider.createPayment({
      orderId: id,
      method,
      safeDisplay: input.safeDisplay ?? null,
    });

    // Re-read after exclusive create — concurrent callers may have reused one PENDING.
    const canonical =
      (await this.payments.findPendingByOrderId(id)) ??
      (await this.payments.findById(created.paymentId));
    const active = canonical ?? {
      paymentId: created.paymentId,
      orderId: id,
      status: "PENDING" as const,
      paymentUrl: created.paymentUrl,
      method: created.method,
      methodLabel: created.methodLabel,
      safeDisplay: input.safeDisplay ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.orders.attachPayment(id, {
      method: active.method,
      methodLabel: active.methodLabel,
      status: "pending",
      safeDisplay: active.safeDisplay,
    });

    logger.info("Payment created", {
      paymentId: active.paymentId,
      orderId: id,
      method: active.method,
    });
    return {
      paymentId: active.paymentId,
      paymentUrl: appendAccessTokenToUrl(active.paymentUrl, accessToken),
      status: "PENDING",
      method: active.method,
      methodLabel: active.methodLabel,
      accessToken,
      orderNumber: order.orderNumber,
    };
  }

  async getPayment(
    paymentId: string,
    accessToken: string,
  ): Promise<PaymentRecordDto> {
    const { payment, token } = await this.requireAuthorizedPayment(
      paymentId,
      accessToken,
    );
    const current = await this.expirePendingIfNeeded(payment);
    return this.enrichPaymentForCustomer(current, token);
  }

  async confirmPayment(
    paymentId: string,
    result: ConfirmPaymentRequestDto["result"],
    accessToken?: string | null,
  ): Promise<ConfirmPaymentResponseDto> {
    assertPublicPreviewCheckoutPaymentAllowed();
    const id = requireString(paymentId, "paymentId");
    const { payment: existing, token } = await this.requireAuthorizedPayment(
      id,
      accessToken ?? "",
    );
    const current = await this.expirePendingIfNeeded(existing);

    // Idempotent success/failure: return the durable state when already applied.
    if (current.status === result) {
      const order = await this.orders.findById(current.orderId);
      const enriched = await this.enrichPaymentForCustomer(current, token);
      return {
        paymentId: current.paymentId,
        orderId: current.orderId,
        status: current.status,
        orderStatus: toApiOrderStatus(order?.status ?? "pending"),
        accessToken: enriched.accessToken ?? null,
        orderNumber: enriched.orderNumber ?? null,
      };
    }

    if (current.status !== "PENDING") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only pending payments can be confirmed.",
        { details: { field: "paymentId", status: current.status } },
      );
    }

    const payment = await this.provider.confirmPayment(id, result);
    await this.syncOrderPaymentSnapshot(payment);
    const orderStatus = await this.syncOrderFromPayment(
      payment.orderId,
      payment.status,
    );

    if (payment.status === "FAILED" && this.notifications) {
      const order = await this.orders.findById(payment.orderId);
      if (order) {
        await this.notifications.onPaymentFailed(order);
      }
    }

    const enriched = await this.enrichPaymentForCustomer(payment, token);
    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: payment.status,
      orderStatus,
      accessToken: enriched.accessToken ?? null,
      orderNumber: enriched.orderNumber ?? null,
    };
  }

  async cancelPayment(
    paymentId: string,
    accessToken?: string | null,
  ): Promise<PaymentRecordDto> {
    const { payment: current, token } = await this.requireAuthorizedPayment(
      requireString(paymentId, "paymentId"),
      accessToken ?? "",
    );
    const active = await this.expirePendingIfNeeded(current);
    if (active.status === "CANCELLED") {
      return this.enrichPaymentForCustomer(active, token);
    }
    if (active.status !== "PENDING") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only pending payments can be cancelled.",
        { details: { field: "paymentId", status: active.status } },
      );
    }
    const payment = await this.provider.cancelPayment(active.paymentId);
    await this.syncOrderPaymentSnapshot(payment);
    await this.syncOrderFromPayment(payment.orderId, payment.status);
    return this.enrichPaymentForCustomer(payment, token);
  }

  async refundPayment(
    paymentId: string,
    accessToken?: string | null,
  ): Promise<PaymentRecordDto> {
    const { payment: current, token } = await this.requireAuthorizedPayment(
      requireString(paymentId, "paymentId"),
      accessToken ?? "",
    );
    const payment = await this.provider.refundPayment(current.paymentId);
    await this.syncOrderPaymentSnapshot(payment);
    await this.syncOrderFromPayment(payment.orderId, payment.status);
    return this.enrichPaymentForCustomer(payment, token);
  }

  /**
   * Secure mock webhook entry: verify signature, enforce idempotency,
   * update payment, sync order.
   */
  async handleMockWebhook(params: {
    rawBody: string;
    signatureHeader: string | null;
    parsedBody: unknown;
  }): Promise<WebhookApplyResult> {
    verifyWebhookSignature(params.rawBody, params.signatureHeader, {
      secret: this.webhookSecret,
      toleranceSeconds: this.webhookToleranceSeconds,
    });

    const event = this.parseMockWebhookEvent(params.parsedBody);

    const claimed = await this.webhookEvents.claimEvent(event.eventId);
    if (!claimed) {
      const payment = await this.provider.getPayment(event.paymentId);
      const order = await this.orders.findById(payment.orderId);
      logger.info("Duplicate webhook event ignored", {
        eventId: event.eventId,
        type: event.type,
      });
      return {
        eventId: event.eventId,
        duplicate: true,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        paymentStatus: payment.status,
        orderStatus: toApiOrderStatus(order?.status ?? "pending"),
      };
    }

    try {
      const nextStatus = paymentStatusFromWebhookEvent(event.type);
      const payment = await this.provider.applyStatus(
        event.paymentId,
        nextStatus,
      );
      await this.syncOrderPaymentSnapshot(payment);
      const orderStatus = await this.syncOrderFromPayment(
        payment.orderId,
        payment.status,
      );

      if (payment.status === "FAILED" && this.notifications) {
        const order = await this.orders.findById(payment.orderId);
        if (order) {
          await this.notifications.onPaymentFailed(order);
        }
      }

      await this.webhookEvents.markProcessed(event.eventId);

      logger.info("Webhook event applied", {
        eventId: event.eventId,
        type: event.type,
        paymentId: payment.paymentId,
        paymentStatus: payment.status,
      });

      return {
        eventId: event.eventId,
        duplicate: false,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        paymentStatus: payment.status,
        orderStatus,
      };
    } catch (error) {
      await this.webhookEvents.releaseClaim(event.eventId);
      throw error;
    }
  }

  /**
   * Load payment then bind capability token. Missing payment and invalid token
   * use the same unauthorized response to avoid payment-id existence oracles.
   */
  private async requireAuthorizedPayment(
    paymentId: string,
    accessToken: string,
  ): Promise<{ payment: PaymentRecordDto; token: string }> {
    const id = requireString(paymentId, "paymentId");
    let payment: PaymentRecordDto;
    try {
      payment = await this.provider.getPayment(id);
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") {
        throw paymentAccessDenied();
      }
      throw error;
    }
    try {
      const token = this.assertOrderAccessToken(payment.orderId, accessToken);
      return { payment, token };
    } catch {
      throw paymentAccessDenied();
    }
  }

  /** Align mock UI expiry with server state for PENDING payments. */
  private async expirePendingIfNeeded(
    payment: PaymentRecordDto,
  ): Promise<PaymentRecordDto> {
    if (payment.status !== "PENDING") return payment;
    const created = Date.parse(payment.createdAt);
    if (!Number.isFinite(created)) return payment;
    if (Date.now() - created < MOCK_PAYMENT_EXPIRY_MS) return payment;
    const expired = await this.provider.applyStatus(payment.paymentId, "EXPIRED");
    await this.syncOrderPaymentSnapshot(expired);
    await this.syncOrderFromPayment(expired.orderId, expired.status);
    return expired;
  }

  private async syncOrderPaymentSnapshot(
    payment: PaymentRecordDto,
  ): Promise<void> {
    await this.orders.attachPayment(payment.orderId, {
      method: payment.method,
      methodLabel: payment.methodLabel || PAYMENT_METHOD_LABELS[payment.method],
      status: orderPaymentStatusFromGateway(payment.status),
      safeDisplay: payment.safeDisplay,
    });
  }

  private async syncOrderFromPayment(
    orderId: string,
    paymentStatus: PaymentStatus,
  ): Promise<ReturnType<typeof toApiOrderStatus>> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found.");
    }

    let next = orderStatusFromPaymentStatus(paymentStatus);
    if (paymentStatus === "CANCELLED" && next === "cancelled") {
      if (!isSafeToCancelOrder(order.status)) {
        next = null;
      }
    }

    let working = order;
    let statusChanged = false;

    if (next && canApplyPaymentOrderStatus(order.status, next) && next !== order.status) {
      working = await this.orders.updateStatus(order.id, next, {
        changedBy: "system:payment",
        note: `Payment status: ${paymentStatus}`,
      });
      statusChanged = true;
      logger.info("Order status synchronized from payment", {
        orderId: order.id,
        orderStatus: working.status,
        paymentStatus,
      });
    }

    if (paymentStatus === "SUCCESS") {
      working = await this.promoteDraftOrderNumber(working.id);
      await this.clearCartAfterSuccessfulPayment(working);
    }

    if (
      working.status === "confirmed" &&
      working.serviceType === "PICKUP" &&
      this.pickupVerifications
    ) {
      try {
        await this.pickupVerifications.ensureForOrder(working.id);
      } catch (error) {
        logger.error("Failed to ensure pickup verification after confirm", {
          orderId: working.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    if (this.notifications && statusChanged) {
      if (working.status === "confirmed") {
        await this.notifications.onOrderConfirmed(working);
      } else if (working.status === "cancelled") {
        await this.notifications.onOrderCancelled(working);
      }
    }

    return toApiOrderStatus(working.status);
  }

  /**
   * Clear the checkout source cart only after durable SUCCESS.
   * Best-effort — must not undo payment/order confirmation.
   */
  private async clearCartAfterSuccessfulPayment(order: {
    id: string;
    sourceCartId?: string;
  }): Promise<void> {
    const cartId = order.sourceCartId?.trim();
    if (!cartId || !this.clearSourceCart) return;
    try {
      await this.clearSourceCart(cartId);
      logger.info("Source cart cleared after payment SUCCESS", {
        orderId: order.id,
        // Never log full cart payloads — id only.
        cartId,
      });
    } catch (error) {
      logger.error("Failed to clear source cart after payment SUCCESS", {
        orderId: order.id,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  /**
   * Promote DRAFT-* → final number after durable payment confirmation.
   * Idempotent across confirm + webhook retries.
   */
  private async promoteDraftOrderNumber(orderId: string) {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found.");
    }
    if (!isDraftOrderNumber(order.orderNumber)) {
      return order;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = createFinalOrderNumber();
      try {
        const updated = await this.orders.updateOrderNumber(orderId, candidate);
        logger.info("Draft order number promoted after payment", {
          orderId,
          orderNumber: updated.orderNumber,
        });
        return updated;
      } catch (error) {
        if (error instanceof AppError && error.code === "CONFLICT") {
          continue;
        }
        throw error;
      }
    }

    throw new AppError(
      "INTERNAL_ERROR",
      "Unable to allocate a unique final order number.",
      { status: 500 },
    );
  }

  private async enrichPaymentForCustomer(
    payment: PaymentRecordDto,
    verifiedAccessToken: string,
  ): Promise<PaymentRecordDto> {
    const order = await this.orders.findById(payment.orderId);
    return {
      ...payment,
      // Echo verified capability token only — never mint without prior proof.
      accessToken: verifiedAccessToken,
      orderNumber: order?.orderNumber ?? null,
      totalThb: order ? minorToMajor(order.totalMinor) : null,
    };
  }
}
