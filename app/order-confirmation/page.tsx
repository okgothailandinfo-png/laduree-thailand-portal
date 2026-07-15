import type { Metadata } from "next";
import OrderConfirmationClient from "./OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Order Confirmation | Ladurée Thailand",
};

export default function OrderConfirmationPage() {
  return <OrderConfirmationClient />;
}
