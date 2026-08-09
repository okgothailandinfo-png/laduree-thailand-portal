import type { NotificationProvider } from "@/src/server/notifications/interfaces";
import { ExternalEmailProvider } from "@/src/server/notifications/providers/external-email.provider";
import { ExternalLineProvider } from "@/src/server/notifications/providers/external-line.provider";
import { MockEmailProvider } from "@/src/server/notifications/providers/mock-email.provider";
import { MockLineProvider } from "@/src/server/notifications/providers/mock-line.provider";
import type { NotificationChannel } from "@/src/server/notifications/types";

export type NotificationProviderKind = "mock" | "external";

export type NotificationProviderOptions = {
  emailProvider?: NotificationProviderKind;
  lineProvider?: NotificationProviderKind;
  mockForceFailure?: boolean;
  mockFailureRetryable?: boolean;
};

export function createNotificationProvider(
  channel: NotificationChannel,
  options: NotificationProviderOptions = {},
): NotificationProvider {
  const forceFailure = options.mockForceFailure ?? false;
  const failureRetryable = options.mockFailureRetryable ?? true;

  if (channel === "EMAIL") {
    const kind = options.emailProvider ?? "mock";
    if (kind === "external") {
      return new ExternalEmailProvider();
    }
    if (kind !== "mock") {
      throw new Error(
        `Unsupported NOTIFICATION_EMAIL_PROVIDER="${String(kind)}".`,
      );
    }
    return new MockEmailProvider({ forceFailure, failureRetryable });
  }

  const kind = options.lineProvider ?? "mock";
  if (kind === "external") {
    return new ExternalLineProvider();
  }
  if (kind !== "mock") {
    throw new Error(
      `Unsupported NOTIFICATION_LINE_PROVIDER="${String(kind)}".`,
    );
  }
  return new MockLineProvider({ forceFailure, failureRetryable });
}

export function createNotificationProviders(
  options: NotificationProviderOptions = {},
): Record<NotificationChannel, NotificationProvider> {
  return {
    EMAIL: createNotificationProvider("EMAIL", options),
    LINE: createNotificationProvider("LINE", options),
  };
}
