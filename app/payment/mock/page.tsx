import type { Metadata } from "next";
import MockPaymentPageClient from "./MockPaymentPageClient";

export const metadata: Metadata = {
  title: "Payment | Ladurée Thailand",
};

type PageProps = {
  searchParams: Promise<{ paymentId?: string }>;
};

export default async function MockPaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <MockPaymentPageClient paymentId={params.paymentId ?? null} />
  );
}
