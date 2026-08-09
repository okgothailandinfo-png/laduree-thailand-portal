/**
 * Subtle prototype/staging notice for mock payment — not customer marketing copy.
 * Keep wording operational and consistent with /payment/mock.
 */

export const MOCK_PAYMENT_MODE_NOTICE =
  "Mock payment only — no real charge was processed.";

export function MockPaymentModeNotice({
  className,
  testId = "mock-payment-mode-notice",
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <p className={className} role="note" data-testid={testId}>
      {MOCK_PAYMENT_MODE_NOTICE}
    </p>
  );
}
