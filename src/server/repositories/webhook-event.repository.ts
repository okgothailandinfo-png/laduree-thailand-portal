export interface WebhookEventRepository {
  /** True only when the event reached PROCESSED (not merely claimed). */
  hasProcessed(eventId: string): Promise<boolean>;
  /**
   * Claim an event id for processing (status = PROCESSING).
   * Returns true when this caller claimed it (or reclaimed a stale PROCESSING).
   * Returns false when already PROCESSED or actively PROCESSING (not stale).
   */
  claimEvent(eventId: string): Promise<boolean>;
  /** Mark a claimed event as durably PROCESSED after successful apply. */
  markProcessed(eventId: string): Promise<void>;
  /**
   * Release a PROCESSING claim after apply failure so retries can reclaim.
   * No-op when the event is already PROCESSED or absent.
   */
  releaseClaim(eventId: string): Promise<void>;
}
