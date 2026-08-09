/**
 * External LINE Messaging adapter boundary — preserved for post-MVP.
 * LINE Login / Messaging are not required for pickup Go-Live.
 */

import type { NotificationProvider } from "@/src/server/notifications/interfaces";
import type {
  ProviderSendFailure,
  ProviderSendInput,
  ProviderSendResult,
} from "@/src/server/notifications/types";
import { AppError } from "@/src/server/utils/errors";

export class ExternalLineProvider implements NotificationProvider {
  readonly providerName = "external-line";

  async validateConfiguration(): Promise<{ ok: boolean; message?: string }> {
    return {
      ok: false,
      message:
        "External LINE adapter is not registered. LINE notifications are deferred from the pickup MVP critical path.",
    };
  }

  async send(
    _input: ProviderSendInput,
  ): Promise<ProviderSendResult | ProviderSendFailure> {
    void _input;
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "External LINE provider is configured but no LINE adapter is registered.",
      { status: 503, details: { provider: this.providerName } },
    );
  }
}
