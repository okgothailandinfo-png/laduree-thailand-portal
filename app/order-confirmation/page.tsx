import type { Metadata } from "next";
import { env } from "@/src/server/config/env";
import OrderConfirmationClient from "./OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Order Confirmation | Ladurée Thailand",
};

type PageProps = {
  searchParams: Promise<{ orderId?: string; token?: string }>;
};

export default async function OrderConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <OrderConfirmationClient
      orderId={params.orderId ?? null}
      accessToken={params.token ?? null}
      isMockPaymentMode={env.paymentProvider === "mock"}
    />
  );
}
