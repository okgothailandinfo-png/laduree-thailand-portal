import type { Prisma } from "@prisma/client";
import { getRequestId } from "@/src/server/http/request-context";
import { getDataSource } from "@/src/server/config/env";
import { prisma } from "@/src/server/database/prisma";
import { logger } from "@/src/server/utils/logger";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.deactivate"
  | "category.create"
  | "category.update"
  | "category.deactivate"
  | "media.upload"
  | "media.delete"
  | "banner.create"
  | "banner.update"
  | "banner.delete"
  | "homepage.change"
  | "order.status_change"
  | "payment.status_change"
  | "pickup.verify"
  | "pickup.complete"
  | "notification.retry"
  | "notification.process"
  | "settings.change";

export type AuditInput = {
  actorId?: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  /** Safe metadata only — never secrets, tokens, codes, or full payloads. */
  metadata?: Record<string, unknown>;
};

const memoryAudit: Array<AuditInput & { id: string; createdAt: string }> = [];

/**
 * Best-effort audit logger.
 *
 * Transaction boundary: callers MUST invoke this AFTER the main business
 * operation has succeeded. Failures are logged and swallowed so audit outages
 * never corrupt or roll back the primary mutation.
 */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  const record = {
    actorId: input.actorId?.trim() || "admin-mock",
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadataJson: input.metadata ?? undefined,
    requestId: getRequestId() ?? null,
  };

  try {
    if (getDataSource() === "prisma") {
      await prisma.auditLog.create({
        data: {
          actorId: record.actorId,
          action: record.action,
          entityType: record.entityType,
          entityId: record.entityId,
          metadataJson:
            (record.metadataJson as Prisma.InputJsonValue | undefined) ??
            undefined,
          requestId: record.requestId,
        },
      });
      return;
    }

    memoryAudit.push({
      ...input,
      id: `audit-${memoryAudit.length + 1}`,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Audit log write failed (ignored)", {
      action: record.action,
      entityType: record.entityType,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
