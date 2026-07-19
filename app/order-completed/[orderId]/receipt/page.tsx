import type { Metadata } from "next";
import OrderReceiptClient from "./OrderReceiptClient";

export const metadata: Metadata = {
  title: "Receipt | Ladurée Thailand",
};

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderReceiptPage({ params }: PageProps) {
  const { orderId } = await params;
  return <OrderReceiptClient orderId={orderId} />;
}
