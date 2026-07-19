import type {
  PickupCredentials,
  PickupVerificationRecord,
} from "@/src/server/models/pickup-verification";
import type { Order } from "@/src/server/models/order";

export type CreatePickupVerificationInput = {
  orderId: string;
  pickupCodeHash: string;
  tokenHash: string;
  customerRevealCipher: string;
  expiresAt?: Date | null;
};

export type MarkVerifiedInput = {
  verificationId: string;
  verifiedBy: string;
  verifiedAt?: Date;
};

export type CompletePickupHandoffInput = {
  orderId: string;
  verificationId: string;
  /** Must be ready_for_pickup — optimistic concurrency. */
  expectedStatus: "ready_for_pickup";
  verifiedBy: string;
  note?: string | null;
};

export type CompletePickupHandoffResult = {
  order: Order;
  verification: PickupVerificationRecord;
  /** True when order was already completed with this verification (idempotent). */
  alreadyCompleted: boolean;
};

/**
 * Persistence for pickup verification credentials.
 * Implementations must never log raw tokens or pickup codes.
 */
export interface PickupVerificationRepository {
  findByOrderId(orderId: string): Promise<PickupVerificationRecord | null>;
  findByTokenHash(tokenHash: string): Promise<PickupVerificationRecord | null>;
  findByPickupCodeHash(
    pickupCodeHash: string,
  ): Promise<PickupVerificationRecord | null>;
  create(
    input: CreatePickupVerificationInput,
  ): Promise<PickupVerificationRecord>;
  /** Replace credentials for an order (regeneration). */
  upsertForOrder(
    input: CreatePickupVerificationInput,
  ): Promise<PickupVerificationRecord>;
  incrementAttempts(id: string): Promise<PickupVerificationRecord>;
  markVerified(input: MarkVerifiedInput): Promise<PickupVerificationRecord>;
  /**
   * Atomically mark verification used, move order to completed, write history.
   */
  completeHandoff(
    input: CompletePickupHandoffInput,
  ): Promise<CompletePickupHandoffResult>;
}

/** Result of ensure/create including raw credentials (returned once to caller). */
export type EnsurePickupVerificationResult = {
  record: PickupVerificationRecord;
  credentials: PickupCredentials;
  created: boolean;
};
