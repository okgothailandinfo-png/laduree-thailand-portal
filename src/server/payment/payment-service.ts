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
import type { PickupVerificationService } from "@/src/server/pickup/pickup-verification.service";
import type { OrderRepository } from "@/src/server/repositories/interfaces";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  requireObject,
  requireString,
} from "@/src/server/utils/validation";
import {
  isPaymentMethodId,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/payment/methods";

const CONFIRM_RESULTS = new Set(["SUCCESS", "FAILED"]);

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
    return {
      orderId: requireString(body.orderId, "orderId"),
      method: methodRaw,
      safeDisplay,
    };
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
    const id = requireString(input.orderId, "orderId");
    const method: PaymentMethodId = input.method;
    const order = await this.orders.findById(id);
    if (!order) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }
    if (
      order.status === "confirmed" ||
      order.payment?.status === "mock_accepted"
    ) {
      throw new AppError("VALIDATION_ERROR", "Order is already paid.", {
        details: { field: "orderId", status: order.status },
      });
    }

    const existing = await this.payments.findByOrderId(id);
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
          paymentUrl: existing.paymentUrl,
          status: "PENDING",
          method: existing.method,
          methodLabel: existing.methodLabel,
        };
      }
      await this.provider.applyStatus(existing.paymentId, "CANCELLED");
    }

    const created = await this.provider.createPayment({
      orderId: id,
      method,
      safeDisplay: input.safeDisplay ?? null,
    });

    await this.orders.attachPayment(id, {
      method: created.method,
      methodLabel: created.methodLabel,
      status: "pending",
      safeDisplay: input.safeDisplay ?? null,
    });

    logger.info("Payment created", {
      paymentId: created.paymentId,
      orderId: id,
      method: created.method,
    });
    return created;
  }

  async getPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.provider.getPayment(requireString(paymentId, "paymentId"));
  }

  async confirmPayment(
    paymentId: string,
    result: ConfirmPaymentRequestDto["result"],
  ): Promise<ConfirmPaymentResponseDto> {
    const id = requireString(paymentId, "paymentId");
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

    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: payment.status,
      orderStatus,
    };
  }

  async cancelPayment(paymentId: string): Promise<PaymentRecordDto> {
    const payment = await this.provider.cancelPayment(
      requireString(paymentId, "paymentId"),
    );
    await this.syncOrderPaymentSnapshot(payment);
    await this.syncOrderFromPayment(payment.orderId, payment.status);
    return payment;
  }

  async refundPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.provider.refundPayment(requireString(paymentId, "paymentId"));
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
      throw new AppError("NOT_FOUND", `Order not found: ${orderId}`);
    }

    let next = orderStatusFromPaymentStatus(paymentStatus);
    if (paymentStatus === "CANCELLED" && next === "cancelled") {
      if (!isSafeToCancelOrder(order.status)) {
        next = null;
      }
    }

    if (next && !canApplyPaymentOrderStatus(order.status, next)) {
      return toApiOrderStatus(order.status);
    }

    if (!next || next === order.status) {
      return toApiOrderStatus(order.status);
    }

    const updated = await this.orders.updateStatus(order.id, next, {
      changedBy: "system:payment",
      note: `Payment status: ${paymentStatus}`,
    });
    logger.info("Order status synchronized from payment", {
      orderId: order.id,
      orderStatus: updated.status,
      paymentStatus,
    });

    if (updated.status === "confirmed" && this.pickupVerifications) {
      try {
        await this.pickupVerifications.ensureForOrder(updated.id);
      } catch (error) {
        logger.error("Failed to ensure pickup verification after confirm", {
          orderId: updated.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    if (this.notifications) {
      if (updated.status === "confirmed") {
        await this.notifications.onOrderConfirmed(updated);
      } else if (updated.status === "cancelled") {
        await this.notifications.onOrderCancelled(updated);
      }
    }

    return toApiOrderStatus(updated.status);
  }
}
