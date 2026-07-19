import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";

/**
 * In-memory processed-event store (development / mock DATA_SOURCE).
 */
export class MockWebhookEventRepository implements WebhookEventRepository {
  private readonly processed = new Set<string>();

  async hasProcessed(eventId: string): Promise<boolean> {
    return this.processed.has(eventId);
  }

  async claimEvent(eventId: string): Promise<boolean> {
    if (this.processed.has(eventId)) return false;
    this.processed.add(eventId);
    return true;
  }

  async markProcessed(eventId: string): Promise<void> {
    this.processed.add(eventId);
  }
}
