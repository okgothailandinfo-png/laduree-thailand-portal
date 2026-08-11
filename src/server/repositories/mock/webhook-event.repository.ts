import {
  isWebhookClaimStale,
  WEBHOOK_CLAIM_STALE_MS,
} from "@/src/server/payment/webhook-claim";
import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";

type StoredWebhookEvent = {
  status: "PROCESSING" | "PROCESSED";
  updatedAt: string;
  processedAt: string | null;
};

/**
 * In-memory two-phase webhook claim store (development / mock DATA_SOURCE).
 */
export class MockWebhookEventRepository implements WebhookEventRepository {
  private readonly events = new Map<string, StoredWebhookEvent>();

  async hasProcessed(eventId: string): Promise<boolean> {
    return this.events.get(eventId)?.status === "PROCESSED";
  }

  async claimEvent(eventId: string): Promise<boolean> {
    const existing = this.events.get(eventId);
    if (!existing) {
      const now = new Date().toISOString();
      this.events.set(eventId, {
        status: "PROCESSING",
        updatedAt: now,
        processedAt: null,
      });
      return true;
    }
    if (existing.status === "PROCESSED") return false;
    if (!isWebhookClaimStale(existing.updatedAt)) return false;
    const now = new Date().toISOString();
    this.events.set(eventId, {
      status: "PROCESSING",
      updatedAt: now,
      processedAt: null,
    });
    return true;
  }

  async markProcessed(eventId: string): Promise<void> {
    const now = new Date().toISOString();
    this.events.set(eventId, {
      status: "PROCESSED",
      updatedAt: now,
      processedAt: now,
    });
  }

  async releaseClaim(eventId: string): Promise<void> {
    const existing = this.events.get(eventId);
    if (existing?.status === "PROCESSING") {
      this.events.delete(eventId);
    }
  }

  /** Test helper — force a PROCESSING row to appear stale. */
  markProcessingStaleForTest(eventId: string): void {
    const existing = this.events.get(eventId);
    if (!existing || existing.status !== "PROCESSING") return;
    this.events.set(eventId, {
      ...existing,
      updatedAt: new Date(Date.now() - WEBHOOK_CLAIM_STALE_MS - 1_000).toISOString(),
    });
  }

  /** Test helper — clears in-memory webhook claims. */
  reset(): void {
    this.events.clear();
  }
}
