import type { Metadata } from "next";
import PaymentPageClient from "./PaymentPageClient";

export const metadata: Metadata = {
  title: "Payment | Ladurée Thailand",
};

type PageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function PaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <PaymentPageClient orderId={params.orderId ?? null} />;
}
