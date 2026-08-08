/**
 * Draft → final Thailand order number promotion.
 *
 * Owner-approved production format (Sprint 25):
 *   LD-TH-XXXXXXXX
 * where XXXXXXXX is 8 uppercase alphanumeric characters (A–Z, 0–9).
 *
 * Example: LD-TH-A7K3M9Q2
 *
 * - Generated from CSPRNG bytes (non-sequential; does not expose order volume)
 * - Uniqueness enforced at repository layer with collision retry
 * - DRAFT-* remains checkout-only and is replaced after successful payment
 * - Existing mock/history numbers with LD-TH-* prefix remain valid final numbers
 */

import { randomBytes } from "crypto";

export const DRAFT_ORDER_NUMBER_PREFIX = "DRAFT-";

/** Owner-approved Thailand customer-facing order number prefix. */
export const FINAL_ORDER_NUMBER_PREFIX = "LD-TH-";

/** Full uppercase alphanumeric alphabet (A–Z, 0–9). */
const FINAL_SUFFIX_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FINAL_SUFFIX_LENGTH = 8;

/** Strict production pattern: LD-TH- + exactly 8 uppercase alphanumeric. */
export const FINAL_ORDER_NUMBER_PATTERN = /^LD-TH-[0-9A-Z]{8}$/;

export function isDraftOrderNumber(orderNumber: string): boolean {
  return orderNumber.trim().toUpperCase().startsWith(DRAFT_ORDER_NUMBER_PREFIX);
}

/**
 * True for any non-draft LD-TH-* customer number.
 * Includes legacy mock samples (e.g. LD-TH-100241) for backward compatibility.
 */
export function isFinalOrderNumber(orderNumber: string): boolean {
  const value = orderNumber.trim().toUpperCase();
  return (
    value.startsWith(FINAL_ORDER_NUMBER_PREFIX) &&
    !isDraftOrderNumber(value)
  );
}

/** True only for the owner-approved LD-TH-XXXXXXXX production shape. */
export function isCanonicalFinalOrderNumber(orderNumber: string): boolean {
  return FINAL_ORDER_NUMBER_PATTERN.test(orderNumber.trim().toUpperCase());
}

/**
 * Generate a new final customer-facing order number (not yet uniqueness-checked).
 * Format: LD-TH-XXXXXXXX (8 uppercase alphanumeric, CSPRNG-based).
 */
export function createFinalOrderNumber(): string {
  const bytes = randomBytes(FINAL_SUFFIX_LENGTH);
  let suffix = "";
  for (let i = 0; i < FINAL_SUFFIX_LENGTH; i += 1) {
    suffix += FINAL_SUFFIX_ALPHABET[bytes[i]! % FINAL_SUFFIX_ALPHABET.length];
  }
  return `${FINAL_ORDER_NUMBER_PREFIX}${suffix}`;
}
