import StorefrontChrome from "../../chrome/StorefrontChrome";
import MockPaymentPageClient from "./MockPaymentPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";
import { readPreviewCommerceSnapshot } from "@/src/server/preview/preview-commerce-cookie";

export const metadata = transactionalPageMetadata("Payment");

type PageProps = {
  searchParams: Promise<{ paymentId?: string; token?: string }>;
};

export default async function MockPaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let paymentId = params.paymentId?.trim() || null;
  if (!paymentId) {
    const snapshot = await readPreviewCommerceSnapshot();
    const payment = snapshot?.payment;
    if (
      payment &&
      snapshot?.paymentClosed !== true &&
      payment.status === "PENDING"
    ) {
      paymentId = payment.paymentId;
    }
  }
  return (
    <StorefrontChrome>
      <MockPaymentPageClient
        paymentId={paymentId}
        accessToken={params.token ?? null}
      />
    </StorefrontChrome>
  );
}
