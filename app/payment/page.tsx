import StorefrontChrome from "../chrome/StorefrontChrome";
import PaymentPageClient from "./PaymentPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";
import { readPreviewCommerceSnapshot } from "@/src/server/preview/preview-commerce-cookie";

export const metadata = transactionalPageMetadata("Payment");

type PageProps = {
  searchParams: Promise<{ orderId?: string; token?: string }>;
};

export default async function PaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let orderId = params.orderId?.trim() || null;
  if (!orderId) {
    const snapshot = await readPreviewCommerceSnapshot();
    orderId = snapshot?.order?.id ?? null;
  }
  return (
    <StorefrontChrome>
      <PaymentPageClient
        orderId={orderId}
        accessToken={params.token ?? null}
      />
    </StorefrontChrome>
  );
}
