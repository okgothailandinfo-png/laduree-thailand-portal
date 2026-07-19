/** Browser-local order id tracking for customer history (no account auth). */

const STORAGE_KEY = "laduree.customerOrderIds";
const MAX_IDS = 50;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readIds(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_IDS)));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function listRememberedOrderIds(): string[] {
  return readIds();
}

export function rememberCustomerOrderId(orderId: string): void {
  const id = orderId.trim();
  if (!id) return;
  const existing = readIds().filter((value) => value !== id);
  writeIds([id, ...existing]);
}
