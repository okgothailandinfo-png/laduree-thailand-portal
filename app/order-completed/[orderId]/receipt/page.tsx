import type { Metadata } from "next";
import OrderReceiptClient from "./OrderReceiptClient";

export const metadata: Metadata = {
  title: "Receipt | Ladurée Thailand",
};

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function OrderReceiptPage({
  params,
  searchParams,
}: PageProps) {
  const { orderId } = await params;
  const query = await searchParams;
  return (
    <OrderReceiptClient
      orderId={orderId}
      accessToken={query.token ?? null}
    />
  );
}
