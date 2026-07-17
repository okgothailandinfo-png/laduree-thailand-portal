import type {
  ConfirmPaymentRequestDto,
  ConfirmPaymentResponseDto,
  CreatePaymentRequestDto,
  CreatePaymentResult,
  PaymentRecordDto,
} from "@/src/server/payment/dto";
import { createPaymentProvider } from "@/src/server/payment/factory";
import type { PaymentProvider } from "@/src/server/payment/interfaces";
import {
  orderStatusFromPaymentResult,
  toApiOrderStatus,
} from "@/src/server/payment/status-mapping";
import type { OrderRepository } from "@/src/server/repositories/interfaces";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

const CONFIRM_RESULTS = new Set(["SUCCESS", "FAILED"]);

export class PaymentService {
  private readonly provider: PaymentProvider;

  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
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

    const order = await this.orders.findById(payment.orderId);
    if (!order) {
      throw new AppError("NOT_FOUND", `Order not found: ${payment.orderId}`);
    }

    const nextOrderStatus = orderStatusFromPaymentResult(result);
    let orderStatus = order.status;
    if (nextOrderStatus) {
      const updated = await this.orders.updateStatus(
        order.id,
        nextOrderStatus,
      );
      orderStatus = updated.status;
      logger.info("Order confirmed after payment", {
        orderId: order.id,
        paymentId: payment.paymentId,
      });
    }

    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: payment.status,
      orderStatus: toApiOrderStatus(orderStatus),
    };
  }

  async cancelPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.provider.cancelPayment(requireString(paymentId, "paymentId"));
  }

  async refundPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.provider.refundPayment(requireString(paymentId, "paymentId"));
  }
}
