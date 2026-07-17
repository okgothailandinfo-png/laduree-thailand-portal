import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";

/**
 * In-memory processed-event store.
 * Replaceable later with a persistent provider-specific event table.
 */
export class MockWebhookEventRepository implements WebhookEventRepository {
  private readonly processed = new Set<string>();

  async hasProcessed(eventId: string): Promise<boolean> {
    return this.processed.has(eventId);
  }

  async markProcessed(eventId: string): Promise<void> {
    this.processed.add(eventId);
  }
}
