/**
 * Mock credit-card field validation.
 * Never log or persist full PAN / CVV — callers must strip secrets.
 */

export type CardDraft = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

export type CardFieldKey = keyof CardDraft;

export type CardFieldErrors = Partial<Record<CardFieldKey, string>>;

const CARD_FIELD_ORDER: CardFieldKey[] = [
  "cardholderName",
  "cardNumber",
  "expiry",
  "cvv",
];

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formats digits as groups of 4 for display only. */
export function formatCardNumberInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiryInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function safeCardDisplayFromNumber(cardNumber: string): string {
  const digits = digitsOnly(cardNumber);
  const last4 = digits.slice(-4);
  if (last4.length < 4) return "Card ending in ****";
  return `Card ending in ${last4}`;
}

function parseExpiry(expiry: string): { month: number; year: number } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year)) return null;
  return { month, year };
}

function isExpiryExpired(
  month: number,
  year: number,
  now: Date = new Date(),
): boolean {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return true;
  if (year === currentYear && month < currentMonth) return true;
  return false;
}

export function validateMockCard(
  card: CardDraft,
  now: Date = new Date(),
): CardFieldErrors {
  const errors: CardFieldErrors = {};

  if (!card.cardholderName.trim()) {
    errors.cardholderName = "Cardholder name is required.";
  }

  const panDigits = digitsOnly(card.cardNumber);
  if (!card.cardNumber.trim()) {
    errors.cardNumber = "Card number is required.";
  } else if (!/^\d[\d\s]*$/.test(card.cardNumber.trim())) {
    errors.cardNumber = "Card number accepts digits only.";
  } else if (panDigits.length < 13 || panDigits.length > 19) {
    errors.cardNumber = "Enter a valid card number.";
  }

  if (!card.expiry.trim()) {
    errors.expiry = "Expiry is required.";
  } else {
    const parsed = parseExpiry(card.expiry.trim());
    if (!parsed) {
      errors.expiry = "Expiry must be MM/YY.";
    } else if (isExpiryExpired(parsed.month, parsed.year, now)) {
      errors.expiry = "Card expiry date has passed.";
    }
  }

  const cvvDigits = digitsOnly(card.cvv);
  if (!card.cvv.trim()) {
    errors.cvv = "CVV is required.";
  } else if (!/^\d{3,4}$/.test(cvvDigits) || cvvDigits !== card.cvv.trim()) {
    errors.cvv = "CVV must be 3–4 digits.";
  }

  return errors;
}

export function firstInvalidCardFieldId(
  errors: CardFieldErrors,
): string | null {
  for (const key of CARD_FIELD_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

export function focusFirstInvalidCardField(errors: CardFieldErrors): void {
  const id = firstInvalidCardFieldId(errors);
  if (!id || typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el && "focus" in el) {
    (el as HTMLElement).focus();
  }
}
