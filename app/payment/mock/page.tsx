import StorefrontChrome from "../../chrome/StorefrontChrome";
import MockPaymentPageClient from "./MockPaymentPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata = transactionalPageMetadata("Payment");

type PageProps = {
  searchParams: Promise<{ paymentId?: string; token?: string }>;
};

export default async function MockPaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <StorefrontChrome>
      <MockPaymentPageClient
        paymentId={params.paymentId ?? null}
        accessToken={params.token ?? null}
      />
    </StorefrontChrome>
  );
}
