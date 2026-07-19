import type { NotificationSettingRepository } from "@/src/server/notifications/interfaces";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationSetting,
} from "@/src/server/notifications/types";
import {
  CUSTOMER_DELIVERY_EVENTS,
  DEFAULT_DISABLED_CUSTOMER_EVENTS,
} from "@/src/server/notifications/types";
import { AppError } from "@/src/server/utils/errors";

export function channelSettingKey(channel: NotificationChannel): string {
  return `channel.${channel}`;
}

export function eventSettingKey(
  channel: NotificationChannel,
  eventType: NotificationEventType,
): string {
  return `event.${channel}.${eventType}`;
}

function defaultChannelEnabled(channel: NotificationChannel): boolean {
  // LINE disabled by default — no LINE identity model exists yet.
  return channel === "EMAIL";
}

function defaultEventEnabled(
  channel: NotificationChannel,
  eventType: NotificationEventType,
): boolean {
  if (channel === "LINE") return false;
  if (DEFAULT_DISABLED_CUSTOMER_EVENTS.has(eventType)) return false;
  return CUSTOMER_DELIVERY_EVENTS.has(eventType);
}

export function buildDefaultSettings(): Array<{
  key: string;
  channel: NotificationChannel;
  isEnabled: boolean;
}> {
  const channels: NotificationChannel[] = ["EMAIL", "LINE"];
  const events: NotificationEventType[] = [
    "ORDER_CONFIRMED",
    "PAYMENT_SUCCEEDED",
    "PAYMENT_FAILED",
    "ORDER_PREPARING",
    "ORDER_READY_FOR_PICKUP",
    "ORDER_CANCELLED",
    "PICKUP_COMPLETED",
  ];
  const defaults: Array<{
    key: string;
    channel: NotificationChannel;
    isEnabled: boolean;
  }> = [];

  for (const channel of channels) {
    defaults.push({
      key: channelSettingKey(channel),
      channel,
      isEnabled: defaultChannelEnabled(channel),
    });
    for (const eventType of events) {
      defaults.push({
        key: eventSettingKey(channel, eventType),
        channel,
        isEnabled: defaultEventEnabled(channel, eventType),
      });
    }
  }
  return defaults;
}

export class NotificationSettingsService {
  constructor(private readonly settings: NotificationSettingRepository) {}

  async ensureDefaults(): Promise<NotificationSetting[]> {
    return this.settings.ensureDefaults(buildDefaultSettings());
  }

  async list(): Promise<NotificationSetting[]> {
    await this.ensureDefaults();
    return this.settings.list();
  }

  async isChannelEnabled(channel: NotificationChannel): Promise<boolean> {
    await this.ensureDefaults();
    const row = await this.settings.findByKey(channelSettingKey(channel));
    if (row) return row.isEnabled;
    return defaultChannelEnabled(channel);
  }

  async isEventEnabled(
    channel: NotificationChannel,
    eventType: NotificationEventType,
  ): Promise<boolean> {
    if (!(await this.isChannelEnabled(channel))) return false;
    await this.ensureDefaults();
    const row = await this.settings.findByKey(
      eventSettingKey(channel, eventType),
    );
    if (row) return row.isEnabled;
    return defaultEventEnabled(channel, eventType);
  }

  async update(params: {
    key: string;
    isEnabled: boolean;
  }): Promise<NotificationSetting> {
    await this.ensureDefaults();
    const existing = await this.settings.findByKey(params.key);
    if (!existing) {
      const defaults = buildDefaultSettings();
      const match = defaults.find((d) => d.key === params.key);
      if (!match) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Unknown notification setting key: ${params.key}`,
          { details: { field: "key" } },
        );
      }
      return this.settings.upsert({
        key: match.key,
        channel: match.channel,
        isEnabled: params.isEnabled,
      });
    }
    return this.settings.upsert({
      key: existing.key,
      channel: existing.channel,
      isEnabled: params.isEnabled,
    });
  }

  async updateMany(
    updates: Array<{ key: string; isEnabled: boolean }>,
  ): Promise<NotificationSetting[]> {
    for (const update of updates) {
      await this.update(update);
    }
    return this.list();
  }
}
