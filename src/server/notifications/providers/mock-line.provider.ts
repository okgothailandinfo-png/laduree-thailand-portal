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
 * Mock LINE provider — NON-PRODUCTION.
 * Never contacts LINE Messaging API.
 */
export class MockLineProvider implements NotificationProvider {
  readonly providerName = "mock-line";

  constructor(
    private readonly options: {
      forceFailure?: boolean;
      failureRetryable?: boolean;
    } = {},
  ) {}

  async validateConfiguration(): Promise<{ ok: boolean; message?: string }> {
    return {
      ok: true,
      message:
        "Mock LINE provider (non-production). LINE identity linking required before real delivery.",
    };
  }

  async send(
    input: ProviderSendInput,
  ): Promise<ProviderSendResult | ProviderSendFailure> {
    const meta = recipientLogMeta(input.channel, input.recipient);

    if (this.options.forceFailure) {
      const errorCode = "MOCK_LINE_FORCED_FAILURE";
      logger.warn("Mock LINE send failure", {
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

    const providerMessageId = `mock-line_${randomUUID()}`;
    logger.info("Mock LINE send success", {
      provider: this.providerName,
      nonProduction: true,
      jobId: input.meta.jobId,
      eventType: input.meta.eventType,
      orderId: input.meta.orderId,
      templateKey: input.templateKey,
      providerMessageId,
      textLength: input.rendered.lineText.length,
      ...meta,
    });

    return { ok: true, providerMessageId };
  }
}
