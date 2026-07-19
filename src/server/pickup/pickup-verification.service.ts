import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type {
  AdminPickupCompleteInput,
  AdminPickupCompleteResultDto,
  AdminPickupRegenerateResultDto,
  AdminPickupVerifyInput,
  AdminPickupVerifyResultDto,
} from "@/src/server/admin/dto";
import { toAdminWorkflowStatus } from "@/src/server/orders/status-transitions";
import type { Order } from "@/src/server/models/order";
import type {
  PickupAllowedAction,
  PickupCredentials,
  PickupVerificationRecord,
  PickupVerificationStatus,
} from "@/src/server/models/pickup-verification";
import {
  buildQrPayload,
  decryptCustomerReveal,
  encryptCustomerReveal,
  extractTokenFromQrPayload,
  generatePickupCredentials,
  hashPickupSecret,
  normalizePickupCode,
  safeEqualHash,
} from "@/src/server/pickup/crypto";
import type { NotificationOrchestrator } from "@/src/server/notifications/orchestrator";
import type { PickupVerificationRepository } from "@/src/server/pickup/pickup-verification.repository";
import { checkPickupVerifyRateLimit } from "@/src/server/pickup/rate-limit";
import type {
  AdminOrderDetailRecord,
  OrderRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  optionalString,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

const GENERIC_VERIFY_ERROR =
  "Pickup verification failed. Check the code and try again.";

const MOCK_ADMIN_ACTOR = "mock-admin";

/** Default credential lifetime from creation (7 days). */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CustomerPickupCredentialsDto = {
  pickupCode: string;
  /** Opaque QR payload — not an internal order id. */
  qrPayload: string;
  expiresAt: string | null;
};

function paymentAllowsPickup(
  paymentStatus: AdminOrderDetailRecord["paymentStatus"],
): boolean {
  return paymentStatus === "mock_accepted";
}

function isExpired(record: PickupVerificationRecord, now = new Date()): boolean {
  if (!record.expiresAt) return false;
  return new Date(record.expiresAt).getTime() <= now.getTime();
}

function verificationStatusOf(
  record: PickupVerificationRecord | null,
): PickupVerificationStatus {
  if (!record) return "unavailable";
  if (record.verifiedAt) return "verified";
  if (isExpired(record)) return "expired";
  return "active";
}

function allowedActionFor(
  order: Order,
  paymentStatus: AdminOrderDetailRecord["paymentStatus"],
  verificationStatus: PickupVerificationStatus,
): PickupAllowedAction {
  if (
    order.status === "cancelled" ||
    order.status === "completed" ||
    verificationStatus === "expired" ||
    verificationStatus === "unavailable"
  ) {
    return "none";
  }
  if (!paymentAllowsPickup(paymentStatus)) return "none";
  if (order.status === "ready_for_pickup" && verificationStatus === "active") {
    return "complete_pickup";
  }
  if (
    order.status === "ready_for_pickup" &&
    verificationStatus === "verified"
  ) {
    return "complete_pickup";
  }
  if (
    order.status === "confirmed" ||
    order.status === "preparing" ||
    order.status === "mock_placed" ||
    order.status === "pending"
  ) {
    return "wait_until_ready";
  }
  return "none";
}

function customerDisplayName(order: Order): string {
  return (
    order.customer.recipientName?.trim() ||
    order.customer.customerName.trim() ||
    "Customer"
  );
}

function itemCountOf(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export class PickupVerificationService {
  constructor(
    private readonly verifications: PickupVerificationRepository,
    private readonly orders: OrderRepository,
    private readonly notifications?: NotificationOrchestrator,
  ) {}

  /**
   * Ensure pickup credentials exist for a confirmed order.
   * Idempotent — does not regenerate on refresh / repeat calls.
   */
  async ensureForOrder(orderId: string): Promise<PickupVerificationRecord> {
    const existing = await this.verifications.findByOrderId(orderId);
    if (existing) return existing;

    const credentials = generatePickupCredentials();
    const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);
    try {
      return await this.verifications.create({
        orderId,
        pickupCodeHash: hashPickupSecret(credentials.pickupCode),
        tokenHash: hashPickupSecret(credentials.token),
        customerRevealCipher: encryptCustomerReveal(credentials),
        expiresAt,
      });
    } catch (error) {
      // Race: another request created credentials first.
      const raced = await this.verifications.findByOrderId(orderId);
      if (raced) return raced;
      throw error;
    }
  }

  /** Customer confirmation reveal — decrypts stored cipher; never logs secrets. */
  async getCustomerCredentials(
    orderId: string,
  ): Promise<CustomerPickupCredentialsDto | null> {
    const order = await this.orders.findById(orderId);
    if (!order) return null;
    if (
      order.status === "cancelled" ||
      order.status === "pending" ||
      order.status === "completed"
    ) {
      return null;
    }

    // Lazy ensure covers confirmations created before this sprint.
    const record = await this.ensureForOrder(orderId);
    if (record.verifiedAt || isExpired(record)) {
      return null;
    }

    let credentials: PickupCredentials;
    try {
      credentials = decryptCustomerReveal(record.customerRevealCipher);
    } catch {
      logger.error("Failed to decrypt pickup reveal cipher", { orderId });
      return null;
    }

    return {
      pickupCode: credentials.pickupCode,
      qrPayload: buildQrPayload(credentials.token),
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Authorized regeneration — invalidates previous token/code hashes.
   * Mock admin session required at the route layer.
   */
  async regenerate(
    orderId: string,
  ): Promise<AdminPickupRegenerateResultDto> {
    requirePrismaDataSource();
    const detail = await this.orders.adminFindById(orderId);
    if (!detail) {
      throw new AppError("NOT_FOUND", `Order not found: ${orderId}`);
    }
    if (
      detail.order.status === "cancelled" ||
      detail.order.status === "completed"
    ) {
      throw new AppError(
        "CONFLICT",
        "Cannot regenerate pickup credentials for this order.",
      );
    }

    const credentials = generatePickupCredentials();
    const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);
    await this.verifications.upsertForOrder({
      orderId,
      pickupCodeHash: hashPickupSecret(credentials.pickupCode),
      tokenHash: hashPickupSecret(credentials.token),
      customerRevealCipher: encryptCustomerReveal(credentials),
      expiresAt,
    });

    logger.info("Pickup credentials regenerated", {
      orderId,
      orderNumber: detail.order.orderNumber,
    });

    return {
      orderId,
      orderNumber: detail.order.orderNumber,
      regenerated: true,
    };
  }

  parseVerifyBody(raw: unknown): AdminPickupVerifyInput {
    const body = requireObject(raw, "body");
    const token =
      typeof body.token === "string" ? body.token.trim() : undefined;
    const pickupCode =
      typeof body.pickupCode === "string" ? body.pickupCode.trim() : undefined;

    if (token && pickupCode) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Provide either token or pickupCode, not both.",
      );
    }
    if (token) return { token };
    if (pickupCode) return { pickupCode };
    throw new AppError(
      "VALIDATION_ERROR",
      "Provide token or pickupCode.",
    );
  }

  parseCompleteBody(raw: unknown): AdminPickupCompleteInput {
    const body = requireObject(raw, "body");
    const expectedStatus = requireString(body.expectedStatus, "expectedStatus");
    if (expectedStatus !== "ready_for_pickup") {
      throw new AppError(
        "VALIDATION_ERROR",
        'expectedStatus must be "ready_for_pickup".',
      );
    }
    return {
      expectedStatus: "ready_for_pickup",
      verificationId: requireString(body.verificationId, "verificationId"),
      note: optionalString(body.note, "note"),
    };
  }

  async verify(
    input: AdminPickupVerifyInput,
    options?: { boutiqueId?: string; rateLimitKey?: string },
  ): Promise<AdminPickupVerifyResultDto> {
    requirePrismaDataSource();

    const rateKey = options?.rateLimitKey ?? "admin-pickup-verify";
    const rate = checkPickupVerifyRateLimit(rateKey);
    if (!rate.allowed) {
      logger.warn("Pickup verification rate-limited", {
        retryAfterMs: rate.retryAfterMs,
      });
      throw new AppError(
        "BAD_REQUEST",
        GENERIC_VERIFY_ERROR,
        { status: 429 },
      );
    }

    let record: PickupVerificationRecord | null = null;

    if ("token" in input) {
      const rawToken = extractTokenFromQrPayload(input.token);
      if (!rawToken) {
        logger.info("Pickup verification failed", { reason: "empty_token" });
        throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
      }
      const tokenHash = hashPickupSecret(rawToken);
      record = await this.verifications.findByTokenHash(tokenHash);
      if (record && !safeEqualHash(record.tokenHash, tokenHash)) {
        record = null;
      }
    } else {
      const code = normalizePickupCode(input.pickupCode);
      if (code.length < 6) {
        logger.info("Pickup verification failed", { reason: "short_code" });
        throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
      }
      const codeHash = hashPickupSecret(code);
      record = await this.verifications.findByPickupCodeHash(codeHash);
      if (record && !safeEqualHash(record.pickupCodeHash, codeHash)) {
        record = null;
      }
    }

    if (!record) {
      logger.info("Pickup verification failed", { reason: "no_match" });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    const detail = await this.orders.adminFindById(record.orderId);
    if (!detail) {
      await this.safeIncrementAttempts(record.id);
      logger.info("Pickup verification failed", { reason: "order_missing" });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    const { order } = detail;

    if (options?.boutiqueId && order.pickup.boutiqueId !== options.boutiqueId) {
      await this.safeIncrementAttempts(record.id);
      logger.info("Pickup verification failed", {
        reason: "boutique_mismatch",
        orderId: order.id,
      });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    if (order.status === "cancelled") {
      await this.safeIncrementAttempts(record.id);
      logger.info("Pickup verification failed", {
        reason: "cancelled",
        orderId: order.id,
      });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    if (order.status === "completed") {
      await this.safeIncrementAttempts(record.id);
      logger.info("Pickup verification failed", {
        reason: "already_completed",
        orderId: order.id,
      });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    if (isExpired(record)) {
      await this.safeIncrementAttempts(record.id);
      logger.info("Pickup verification failed", {
        reason: "expired",
        orderId: order.id,
      });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    if (record.verifiedAt) {
      await this.safeIncrementAttempts(record.id);
      logger.info("Pickup verification failed", {
        reason: "already_used",
        orderId: order.id,
      });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    if (!paymentAllowsPickup(detail.paymentStatus)) {
      await this.safeIncrementAttempts(record.id);
      logger.info("Pickup verification failed", {
        reason: "payment_not_accepted",
        orderId: order.id,
      });
      throw new AppError("BAD_REQUEST", GENERIC_VERIFY_ERROR);
    }

    const vStatus = verificationStatusOf(record);
    const allowed = allowedActionFor(order, detail.paymentStatus, vStatus);

    logger.info("Pickup verification succeeded", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      allowedAction: allowed,
    });

    return {
      verificationId: record.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerDisplayName: customerDisplayName(order),
      boutique: {
        id: order.pickup.boutiqueId,
        name: order.pickup.boutiqueName,
        code: detail.boutiqueCode,
      },
      pickupDate: order.pickup.dateKey,
      pickupTime: order.pickup.timeSlotLabel,
      itemCount: itemCountOf(order),
      orderStatus: toAdminWorkflowStatus(order.status),
      paymentStatus: detail.paymentStatus,
      verificationStatus: vStatus,
      allowedAction: allowed,
    };
  }

  async complete(
    orderId: string,
    input: AdminPickupCompleteInput,
  ): Promise<AdminPickupCompleteResultDto> {
    requirePrismaDataSource();

    const detail = await this.orders.adminFindById(orderId);
    if (!detail) {
      throw new AppError("NOT_FOUND", `Order not found: ${orderId}`);
    }

    const verification = await this.verifications.findByOrderId(orderId);
    if (!verification || verification.id !== input.verificationId) {
      throw new AppError(
        "CONFLICT",
        "Successful pickup verification is required before handoff.",
      );
    }

    if (isExpired(verification) && !verification.verifiedAt) {
      throw new AppError("CONFLICT", "Pickup verification has expired.");
    }

    if (!paymentAllowsPickup(detail.paymentStatus)) {
      throw new AppError(
        "CONFLICT",
        "Payment status does not allow pickup handoff.",
      );
    }

    if (
      detail.order.status === "completed" &&
      verification.verifiedAt
    ) {
      logger.info("Duplicate pickup completion rejected (idempotent)", {
        orderId,
        orderNumber: detail.order.orderNumber,
      });
      return {
        orderId,
        orderNumber: detail.order.orderNumber,
        orderStatus: "completed",
        verificationStatus: "verified",
        alreadyCompleted: true,
      };
    }

    if (detail.order.status !== "ready_for_pickup") {
      logger.warn("Pickup completion rejected — not ready", {
        orderId,
        orderNumber: detail.order.orderNumber,
        current: detail.order.status,
      });
      throw new AppError(
        "CONFLICT",
        "Order must be ready for pickup before handoff.",
        {
          details: {
            current: toAdminWorkflowStatus(detail.order.status),
            expected: "ready_for_pickup",
          },
        },
      );
    }

    const result = await this.verifications.completeHandoff({
      orderId,
      verificationId: input.verificationId,
      expectedStatus: "ready_for_pickup",
      verifiedBy: MOCK_ADMIN_ACTOR,
      note: input.note,
    });

    if (result.alreadyCompleted) {
      logger.info("Duplicate pickup completion rejected (idempotent)", {
        orderId,
        orderNumber: result.order.orderNumber,
      });
    } else {
      logger.info("Pickup completed", {
        orderId,
        orderNumber: result.order.orderNumber,
      });
      if (this.notifications) {
        await this.notifications.onPickupCompleted(result.order);
      }
    }

    return {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      orderStatus: toAdminWorkflowStatus(result.order.status),
      verificationStatus: "verified",
      alreadyCompleted: result.alreadyCompleted,
    };
  }

  private async safeIncrementAttempts(id: string): Promise<void> {
    try {
      await this.verifications.incrementAttempts(id);
    } catch {
      // Do not fail the generic error path on attempt-counter issues.
    }
  }
}
