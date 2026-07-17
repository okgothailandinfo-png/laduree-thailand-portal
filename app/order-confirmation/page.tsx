import type { Metadata } from "next";
import OrderConfirmationClient from "./OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Order Confirmation | Ladurée Thailand",
};

type PageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function OrderConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <OrderConfirmationClient orderId={params.orderId ?? null} />;
}
