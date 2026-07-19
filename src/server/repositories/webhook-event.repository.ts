export interface WebhookEventRepository {
  hasProcessed(eventId: string): Promise<boolean>;
  /**
   * Claim an event id for processing.
   * Returns true when this caller claimed it, false when already processed.
   */
  claimEvent(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}
