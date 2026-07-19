import { randomUUID } from "node:crypto";
import type { NotificationProvider } from "@/src/server/notifications/interfaces";
import { recipientLogMeta } from "@/src/server/notifications/masking";
import type {
  ProviderSendFailure,
  ProviderSendInput,
  ProviderSendResult,
} from "@/src/server/notifications/types";
import { logger } from "@/src/server/utils/logger";

/**
 * Mock email provider — NON-PRODUCTION.
 * Never contacts external email services.
 */
export class MockEmailProvider implements NotificationProvider {
  readonly providerName = "mock-email";

  constructor(
    private readonly options: {
      forceFailure?: boolean;
      failureRetryable?: boolean;
    } = {},
  ) {}

  async validateConfiguration(): Promise<{ ok: boolean; message?: string }> {
    return {
      ok: true,
      message: "Mock email provider (non-production).",
    };
  }

  async send(
    input: ProviderSendInput,
  ): Promise<ProviderSendResult | ProviderSendFailure> {
    const meta = recipientLogMeta(input.channel, input.recipient);

    if (this.options.forceFailure) {
      const errorCode = "MOCK_EMAIL_FORCED_FAILURE";
      logger.warn("Mock email send failure", {
        provider: this.providerName,
        nonProduction: true,
        jobId: input.meta.jobId,
        eventType: input.meta.eventType,
        orderId: input.meta.orderId,
        templateKey: input.templateKey,
        ...meta,
        errorCode,
      });
      return {
        ok: false,
        errorCode,
        retryable: this.options.failureRetryable ?? true,
      };
    }

    const providerMessageId = `mock-email_${randomUUID()}`;
    logger.info("Mock email send success", {
      provider: this.providerName,
      nonProduction: true,
      jobId: input.meta.jobId,
      eventType: input.meta.eventType,
      orderId: input.meta.orderId,
      templateKey: input.templateKey,
      providerMessageId,
      subjectLength: input.rendered.subject.length,
      ...meta,
    });

    return { ok: true, providerMessageId };
  }
}
