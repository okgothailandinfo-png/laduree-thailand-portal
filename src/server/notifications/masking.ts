/** Mask contact identifiers for admin list/detail and logs. */

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function maskLineRecipient(recipient: string): string {
  const trimmed = recipient.trim();
  if (trimmed.length <= 4) return "LINE:***";
  return `LINE:${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

export function maskRecipient(
  channel: "EMAIL" | "LINE",
  recipient: string,
): string {
  if (channel === "EMAIL") return maskEmail(recipient);
  return maskLineRecipient(recipient);
}

/** Safe for structured logs — never log full contact. */
export function recipientLogMeta(
  channel: "EMAIL" | "LINE",
  recipient: string,
): { channel: string; recipientMasked: string } {
  return {
    channel,
    recipientMasked: maskRecipient(channel, recipient),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

/**
 * LINE Messaging API requires a LINE user ID — phone numbers are not valid.
 * No LINE identity model exists yet; always return null.
 */
export function resolveLineRecipient(_order: {
  customer: { mobileNumber?: string };
}): string | null {
  return null;
}
