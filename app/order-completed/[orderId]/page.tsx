import type { Metadata } from "next";
import { env } from "@/src/server/config/env";
import OrderCompletedClient from "./OrderCompletedClient";

export const metadata: Metadata = {
  title: "Order Completed | Ladurée Thailand",
};

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function OrderCompletedPage({
  params,
  searchParams,
}: PageProps) {
  const { orderId } = await params;
  const query = await searchParams;
  return (
    <OrderCompletedClient
      orderId={orderId}
      accessToken={query.token ?? null}
      isMockPaymentMode={env.paymentProvider === "mock"}
    />
  );
}
