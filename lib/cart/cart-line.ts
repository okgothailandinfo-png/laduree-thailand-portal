import type { CartModifier } from "@/lib/api/types";

/** Stable key for identical product + modifier + note configurations. */
export function cartLineConfigKey(input: {
  productId: string;
  modifiers: CartModifier[];
  note?: string | null;
}): string {
  const modifiers = [...input.modifiers]
    .map((modifier) => ({
      label: modifier.label,
      quantity: modifier.quantity ?? null,
    }))
    .sort((a, b) => {
      const byLabel = a.label.localeCompare(b.label);
      if (byLabel !== 0) return byLabel;
      return String(a.quantity).localeCompare(String(b.quantity));
    });

  return JSON.stringify({
    productId: input.productId,
    note: input.note ?? null,
    modifiers,
  });
}

export function modifiersMatch(
  left: CartModifier[],
  right: CartModifier[],
): boolean {
  if (left.length !== right.length) return false;
  const a = cartLineConfigKey({ productId: "x", modifiers: left });
  const b = cartLineConfigKey({ productId: "x", modifiers: right });
  return a === b;
}
