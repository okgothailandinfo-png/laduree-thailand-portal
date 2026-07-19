import { prisma } from "@/src/server/database/prisma";
import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";

export class PrismaWebhookEventRepository implements WebhookEventRepository {
  async hasProcessed(eventId: string): Promise<boolean> {
    const row = await prisma.webhookEvent.findUnique({
      where: { eventId },
      select: { id: true },
    });
    return Boolean(row);
  }

  async claimEvent(eventId: string): Promise<boolean> {
    try {
      await prisma.webhookEvent.create({
        data: {
          eventId,
          provider: "mock",
        },
      });
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        return false;
      }
      throw error;
    }
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.claimEvent(eventId);
  }
}
