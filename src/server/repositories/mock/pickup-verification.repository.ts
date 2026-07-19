import { randomUUID } from "crypto";
import type { PickupVerificationRecord } from "@/src/server/models/pickup-verification";
import type {
  CompletePickupHandoffInput,
  CompletePickupHandoffResult,
  CreatePickupVerificationInput,
  MarkVerifiedInput,
  PickupVerificationRepository,
} from "@/src/server/pickup/pickup-verification.repository";
import { AppError } from "@/src/server/utils/errors";

const byId = new Map<string, PickupVerificationRecord>();
const byOrderId = new Map<string, string>();
const byTokenHash = new Map<string, string>();
const byPickupCodeHash = new Map<string, string>();

function index(record: PickupVerificationRecord): void {
  byId.set(record.id, record);
  byOrderId.set(record.orderId, record.id);
  byTokenHash.set(record.tokenHash, record.id);
  byPickupCodeHash.set(record.pickupCodeHash, record.id);
}

function unindex(record: PickupVerificationRecord): void {
  byId.delete(record.id);
  byOrderId.delete(record.orderId);
  byTokenHash.delete(record.tokenHash);
  byPickupCodeHash.delete(record.pickupCodeHash);
}

function toIso(date?: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export class MockPickupVerificationRepository
  implements PickupVerificationRepository
{
  async findByOrderId(
    orderId: string,
  ): Promise<PickupVerificationRecord | null> {
    const id = byOrderId.get(orderId);
    return id ? (byId.get(id) ?? null) : null;
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PickupVerificationRecord | null> {
    const id = byTokenHash.get(tokenHash);
    return id ? (byId.get(id) ?? null) : null;
  }

  async findByPickupCodeHash(
    pickupCodeHash: string,
  ): Promise<PickupVerificationRecord | null> {
    const id = byPickupCodeHash.get(pickupCodeHash);
    return id ? (byId.get(id) ?? null) : null;
  }

  async create(
    input: CreatePickupVerificationInput,
  ): Promise<PickupVerificationRecord> {
    if (byOrderId.has(input.orderId)) {
      throw new AppError(
        "CONFLICT",
        "Pickup verification already exists for this order.",
      );
    }
    const now = new Date().toISOString();
    const record: PickupVerificationRecord = {
      id: randomUUID(),
      orderId: input.orderId,
      pickupCodeHash: input.pickupCodeHash,
      tokenHash: input.tokenHash,
      customerRevealCipher: input.customerRevealCipher,
      expiresAt: toIso(input.expiresAt ?? null),
      verifiedAt: null,
      verifiedBy: null,
      verificationAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    index(record);
    return record;
  }

  async upsertForOrder(
    input: CreatePickupVerificationInput,
  ): Promise<PickupVerificationRecord> {
    const existingId = byOrderId.get(input.orderId);
    const prior = existingId ? byId.get(existingId) : undefined;
    if (prior) unindex(prior);

    const now = new Date().toISOString();
    const record: PickupVerificationRecord = {
      id: prior?.id ?? randomUUID(),
      orderId: input.orderId,
      pickupCodeHash: input.pickupCodeHash,
      tokenHash: input.tokenHash,
      customerRevealCipher: input.customerRevealCipher,
      expiresAt: toIso(input.expiresAt ?? null),
      verifiedAt: null,
      verifiedBy: null,
      verificationAttempts: 0,
      createdAt: prior?.createdAt ?? now,
      updatedAt: now,
    };
    index(record);
    return record;
  }

  async incrementAttempts(id: string): Promise<PickupVerificationRecord> {
    const existing = byId.get(id);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Pickup verification not found.");
    }
    const next: PickupVerificationRecord = {
      ...existing,
      verificationAttempts: existing.verificationAttempts + 1,
      updatedAt: new Date().toISOString(),
    };
    byId.set(id, next);
    return next;
  }

  async markVerified(
    input: MarkVerifiedInput,
  ): Promise<PickupVerificationRecord> {
    const existing = byId.get(input.verificationId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Pickup verification not found.");
    }
    const next: PickupVerificationRecord = {
      ...existing,
      verifiedAt: (input.verifiedAt ?? new Date()).toISOString(),
      verifiedBy: input.verifiedBy,
      updatedAt: new Date().toISOString(),
    };
    byId.set(input.verificationId, next);
    return next;
  }

  async completeHandoff(
    input: CompletePickupHandoffInput,
  ): Promise<CompletePickupHandoffResult> {
    void input;
    throw new AppError(
      "CONFIG_ERROR",
      "Pickup handoff requires DATA_SOURCE=prisma and DATABASE_URL.",
    );
  }
}
