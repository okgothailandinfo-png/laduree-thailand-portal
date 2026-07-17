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
import type { OrderRepository } from "@/src/server/repositories/interfaces";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

const CONFIRM_RESULTS = new Set(["SUCCESS", "FAILED"]);

export type WebhookApplyResult = {
  eventId: string;
  duplicate: boolean;
  paymentId: string;
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: ReturnType<typeof toApiOrderStatus>;
};

export class PaymentService {
  private readonly provider: PaymentProvider;

  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
    private readonly webhookEvents: WebhookEventRepository,
    private readonly webhookSecret: string,
    private readonly webhookToleranceSeconds: number,
    provider?: PaymentProvider,
  ) {
    this.provider = provider ?? createPaymentProvider(payments, "mock");
  }

  parseCreatePaymentBody(raw: unknown): CreatePaymentRequestDto {
    const body = requireObject(raw, "body");
    return {
      orderId: requireString(body.orderId, "orderId"),
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

  async createPayment(orderId: string): Promise<CreatePaymentResult> {
    const id = requireString(orderId, "orderId");
    const order = await this.orders.findById(id);
    if (!order) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }
    if (order.status === "confirmed") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Order is already confirmed.",
        { details: { field: "orderId", status: order.status } },
      );
    }

    const existing = await this.payments.findByOrderId(id);
    if (existing && existing.status === "PENDING") {
      return {
        paymentId: existing.paymentId,
        paymentUrl: existing.paymentUrl,
        status: "PENDING",
      };
    }

    const created = await this.provider.createPayment({ orderId: id });
    logger.info("Payment created", {
      paymentId: created.paymentId,
      orderId: id,
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
    const orderStatus = await this.syncOrderFromPayment(
      payment.orderId,
      payment.status,
    );

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

    if (await this.webhookEvents.hasProcessed(event.eventId)) {
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
    const orderStatus = await this.syncOrderFromPayment(
      payment.orderId,
      payment.status,
    );

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

    // SUCCESS already confirmed → leave confirmed (idempotent).
    if (
      next === "confirmed" &&
      (order.status === "confirmed" || order.status === "cancelled")
    ) {
      if (order.status === "confirmed") {
        return toApiOrderStatus(order.status);
      }
      next = null;
    }

    if (!next || next === order.status) {
      return toApiOrderStatus(order.status);
    }

    const updated = await this.orders.updateStatus(order.id, next);
    logger.info("Order status synchronized from payment", {
      orderId: order.id,
      orderStatus: updated.status,
      paymentStatus,
    });
    return toApiOrderStatus(updated.status);
  }
}
