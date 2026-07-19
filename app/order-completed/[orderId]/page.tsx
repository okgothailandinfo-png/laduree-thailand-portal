import type { Metadata } from "next";
import OrderCompletedClient from "./OrderCompletedClient";

export const metadata: Metadata = {
  title: "Order Completed | Ladurée Thailand",
};

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderCompletedPage({ params }: PageProps) {
  const { orderId } = await params;
  return <OrderCompletedClient orderId={orderId} />;
}
