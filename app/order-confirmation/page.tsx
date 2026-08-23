import type { Metadata } from "next";
import StorefrontChrome from "../chrome/StorefrontChrome";
import { env } from "@/src/server/config/env";
import OrderConfirmationClient from "./OrderConfirmationClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";
import { readPreviewConfirmationOrderId } from "@/src/server/preview/preview-commerce-cookie";

export const metadata: Metadata = transactionalPageMetadata("Order Confirmation");

type PageProps = {
  searchParams: Promise<{ orderId?: string; token?: string }>;
};

export default async function OrderConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId =
    params.orderId?.trim() || (await readPreviewConfirmationOrderId());
  return (
    <StorefrontChrome>
      <OrderConfirmationClient
        orderId={orderId}
        accessToken={params.token ?? null}
        isMockPaymentMode={env.paymentProvider === "mock"}
      />
    </StorefrontChrome>
  );
}
