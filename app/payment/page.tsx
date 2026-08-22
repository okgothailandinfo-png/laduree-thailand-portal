import StorefrontChrome from "../chrome/StorefrontChrome";
import PaymentPageClient from "./PaymentPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata = transactionalPageMetadata("Payment");

type PageProps = {
  searchParams: Promise<{ orderId?: string; token?: string }>;
};

export default async function PaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <StorefrontChrome>
      <PaymentPageClient
        orderId={params.orderId ?? null}
        accessToken={params.token ?? null}
      />
    </StorefrontChrome>
  );
}
