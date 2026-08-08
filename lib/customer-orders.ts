/**
 * Browser-local order tracking for guest (and member) history reopen.
 * Stores order id + capability token — never expose tokens in logs.
 */

const STORAGE_KEY = "laduree.customerOrders.v2";
/** Legacy id-only list — migrated on read. */
const LEGACY_STORAGE_KEY = "laduree.customerOrderIds";
const MAX_ENTRIES = 50;

export type RememberedCustomerOrder = {
  orderId: string;
  accessToken: string;
  orderNumber?: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readEntries(): RememberedCustomerOrder[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const record = row as Record<string, unknown>;
          const orderId =
            typeof record.orderId === "string" ? record.orderId.trim() : "";
          const accessToken =
            typeof record.accessToken === "string"
              ? record.accessToken.trim()
              : "";
          if (!orderId || !accessToken) return null;
          const orderNumber =
            typeof record.orderNumber === "string"
              ? record.orderNumber.trim()
              : undefined;
          return {
            orderId,
            accessToken,
            ...(orderNumber ? { orderNumber } : {}),
          } satisfies RememberedCustomerOrder;
        })
        .filter((row): row is RememberedCustomerOrder => row !== null);
    }

    // One-time migration: legacy ids without tokens cannot unlock secured APIs.
    // Drop them so history does not show unopenable rows.
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

function writeEntries(entries: RememberedCustomerOrder[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES)),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function listRememberedOrders(): RememberedCustomerOrder[] {
  return readEntries();
}

export function listRememberedOrderIds(): string[] {
  return readEntries().map((entry) => entry.orderId);
}

export function getRememberedOrderAccessToken(orderId: string): string | null {
  const id = orderId.trim();
  if (!id) return null;
  return readEntries().find((entry) => entry.orderId === id)?.accessToken ?? null;
}

export function rememberCustomerOrder(input: {
  orderId: string;
  accessToken: string;
  orderNumber?: string | null;
}): void {
  const orderId = input.orderId.trim();
  const accessToken = input.accessToken.trim();
  if (!orderId || !accessToken) return;
  const orderNumber = input.orderNumber?.trim() || undefined;
  const existing = readEntries().filter((entry) => entry.orderId !== orderId);
  writeEntries([
    {
      orderId,
      accessToken,
      ...(orderNumber ? { orderNumber } : {}),
    },
    ...existing,
  ]);
}

/** @deprecated Prefer rememberCustomerOrder with accessToken. */
export function rememberCustomerOrderId(orderId: string): void {
  const id = orderId.trim();
  if (!id) return;
  const existing = readEntries().find((entry) => entry.orderId === id);
  if (existing) {
    // Keep existing tokenized entry at front.
    rememberCustomerOrder(existing);
  }
}
