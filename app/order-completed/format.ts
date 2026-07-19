/** Shared display helpers for completion / receipt / history (Asia/Bangkok). */

const BANGKOK = "Asia/Bangkok";

export function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export function formatDateTimeBangkok(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    timeZone: BANGKOK,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatModifierLine(
  modifiers: Array<{ label: string; quantity?: number }>,
): string {
  if (modifiers.length === 0) return "";
  return modifiers
    .map((modifier) =>
      modifier.quantity
        ? `${modifier.quantity}× ${modifier.label}`
        : modifier.label,
    )
    .join(", ");
}
