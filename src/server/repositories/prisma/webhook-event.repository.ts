import { prisma } from "@/src/server/database/prisma";
import {
  isPrismaUniqueViolation,
  isWebhookClaimStale,
} from "@/src/server/payment/webhook-claim";
import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";

export class PrismaWebhookEventRepository implements WebhookEventRepository {
  async hasProcessed(eventId: string): Promise<boolean> {
    const row = await prisma.webhookEvent.findUnique({
      where: { eventId },
      select: { status: true },
    });
    return row?.status === "PROCESSED";
  }

  async claimEvent(eventId: string): Promise<boolean> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await prisma.webhookEvent.create({
          data: {
            eventId,
            provider: "mock",
            status: "PROCESSING",
            processedAt: null,
          },
        });
        return true;
      } catch (error) {
        if (!isPrismaUniqueViolation(error)) throw error;
        const existing = await prisma.webhookEvent.findUnique({
          where: { eventId },
        });
        if (!existing) continue;
        if (existing.status === "PROCESSED") return false;
        if (!isWebhookClaimStale(existing.updatedAt)) return false;
        await prisma.webhookEvent.deleteMany({
          where: {
            eventId,
            status: "PROCESSING",
            updatedAt: { lte: existing.updatedAt },
          },
        });
      }
    }
    return false;
  }

  async markProcessed(eventId: string): Promise<void> {
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
  }

  async releaseClaim(eventId: string): Promise<void> {
    await prisma.webhookEvent.deleteMany({
      where: { eventId, status: "PROCESSING" },
    });
  }
}
