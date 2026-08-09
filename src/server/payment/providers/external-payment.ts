/**
 * External PSP adapter boundary — vendor-neutral.
 *
 * Does not invent PSP API behavior. A real Thailand PSP adapter must be
 * registered via createPaymentProvider("external") once merchant credentials
 * and adapter module are approved. Until then, operations fail closed.
 */

import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRecordDto,
  PaymentStatus,
} from "@/src/server/payment/dto";
import type { PaymentProvider } from "@/src/server/payment/interfaces";
import { AppError } from "@/src/server/utils/errors";

function unavailable(operation: string): never {
  throw new AppError(
    "PROVIDER_UNAVAILABLE",
    `External payment provider is configured but no PSP adapter is registered (${operation}). Wire a Thailand PSP adapter module and credentials before production traffic.`,
    { status: 503, details: { provider: "external", operation } },
  );
}

export class ExternalPaymentProvider implements PaymentProvider {
  readonly name = "external" as const;

  async createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    void _input;
    return unavailable("createPayment");
  }

  async getPayment(_paymentId: string): Promise<PaymentRecordDto> {
    void _paymentId;
    return unavailable("getPayment");
  }

  async confirmPayment(
    _paymentId: string,
    _result: Extract<PaymentStatus, "SUCCESS" | "FAILED">,
  ): Promise<PaymentRecordDto> {
    void _paymentId;
    void _result;
    return unavailable("confirmPayment");
  }

  async cancelPayment(_paymentId: string): Promise<PaymentRecordDto> {
    void _paymentId;
    return unavailable("cancelPayment");
  }

  async refundPayment(_paymentId: string): Promise<PaymentRecordDto> {
    void _paymentId;
    return unavailable("refundPayment");
  }

  async applyStatus(
    _paymentId: string,
    _status: PaymentStatus,
  ): Promise<PaymentRecordDto> {
    void _paymentId;
    void _status;
    return unavailable("applyStatus");
  }
}
