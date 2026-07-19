/** Domain model for pickup check-in credentials (hashes only). */

export type PickupVerificationRecord = {
  id: string;
  orderId: string;
  pickupCodeHash: string;
  tokenHash: string;
  /** AES-GCM ciphertext for customer confirmation display. Never log. */
  customerRevealCipher: string;
  expiresAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  verificationAttempts: number;
  createdAt: string;
  updatedAt: string;
};

export type PickupCredentials = {
  /** Cryptographically secure QR token (raw — return only to customer flow). */
  token: string;
  /** Short human-readable pickup code for manual entry. */
  pickupCode: string;
};

export type PickupVerificationStatus =
  | "active"
  | "verified"
  | "expired"
  | "unavailable";

export type PickupAllowedAction =
  | "complete_pickup"
  | "wait_until_ready"
  | "none";
