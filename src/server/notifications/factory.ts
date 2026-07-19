import type { NotificationProvider } from "@/src/server/notifications/interfaces";
import { MockEmailProvider } from "@/src/server/notifications/providers/mock-email.provider";
import { MockLineProvider } from "@/src/server/notifications/providers/mock-line.provider";
import type { NotificationChannel } from "@/src/server/notifications/types";

export type NotificationProviderKind = "mock";

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
    if (kind !== "mock") {
      throw new Error(
        `Unsupported NOTIFICATION_EMAIL_PROVIDER="${kind}". Only "mock" is supported in this sprint.`,
      );
    }
    return new MockEmailProvider({ forceFailure, failureRetryable });
  }

  const kind = options.lineProvider ?? "mock";
  if (kind !== "mock") {
    throw new Error(
      `Unsupported NOTIFICATION_LINE_PROVIDER="${kind}". Only "mock" is supported in this sprint.`,
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
