/**
 * External email adapter boundary — vendor-neutral.
 * Does not invent ESP APIs. Register a real adapter when the email vendor is chosen.
 */

import type { NotificationProvider } from "@/src/server/notifications/interfaces";
import type {
  ProviderSendFailure,
  ProviderSendInput,
  ProviderSendResult,
} from "@/src/server/notifications/types";
import { AppError } from "@/src/server/utils/errors";

export class ExternalEmailProvider implements NotificationProvider {
  readonly providerName = "external-email";

  async validateConfiguration(): Promise<{ ok: boolean; message?: string }> {
    return {
      ok: false,
      message:
        "External email adapter is not registered. Configure NOTIFICATION_EMAIL_PROVIDER=external credentials/adapter before production.",
    };
  }

  async send(
    _input: ProviderSendInput,
  ): Promise<ProviderSendResult | ProviderSendFailure> {
    void _input;
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "External email provider is configured but no email adapter is registered.",
      { status: 503, details: { provider: this.providerName } },
    );
  }
}
