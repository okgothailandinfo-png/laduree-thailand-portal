import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";

describe("Sprint 32 — MockWebhookEventRepository two-phase claim", () => {
  it("claims as PROCESSING and only reports processed after markProcessed", async () => {
    const repo = new MockWebhookEventRepository();
    const eventId = "evt-1";

    assert.equal(await repo.claimEvent(eventId), true);
    assert.equal(await repo.hasProcessed(eventId), false);
    assert.equal(await repo.claimEvent(eventId), false);

    await repo.markProcessed(eventId);
    assert.equal(await repo.hasProcessed(eventId), true);
    assert.equal(await repo.claimEvent(eventId), false);
  });

  it("releaseClaim allows a retry after failure", async () => {
    const repo = new MockWebhookEventRepository();
    const eventId = "evt-release";

    assert.equal(await repo.claimEvent(eventId), true);
    await repo.releaseClaim(eventId);
    assert.equal(await repo.hasProcessed(eventId), false);
    assert.equal(await repo.claimEvent(eventId), true);
    await repo.markProcessed(eventId);
    assert.equal(await repo.hasProcessed(eventId), true);
  });

  it("does not release a PROCESSED event", async () => {
    const repo = new MockWebhookEventRepository();
    const eventId = "evt-processed";
    assert.equal(await repo.claimEvent(eventId), true);
    await repo.markProcessed(eventId);
    await repo.releaseClaim(eventId);
    assert.equal(await repo.hasProcessed(eventId), true);
    assert.equal(await repo.claimEvent(eventId), false);
  });

  it("reclaims stale PROCESSING claims", async () => {
    const repo = new MockWebhookEventRepository();
    const eventId = "evt-stale";
    assert.equal(await repo.claimEvent(eventId), true);
    repo.markProcessingStaleForTest(eventId);
    assert.equal(await repo.claimEvent(eventId), true);
    assert.equal(await repo.hasProcessed(eventId), false);
  });
});
