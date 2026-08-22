import type { Metadata } from "next";
import StorefrontChrome from "../../../chrome/StorefrontChrome";
import { env } from "@/src/server/config/env";
import OrderReceiptClient from "./OrderReceiptClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = transactionalPageMetadata("Receipt");

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
    <StorefrontChrome>
      <OrderReceiptClient
        orderId={orderId}
        accessToken={query.token ?? null}
        isMockPaymentMode={env.paymentProvider === "mock"}
      />
    </StorefrontChrome>
  );
}
