import type { Metadata } from "next";
import OrderHistoryClient from "./OrderHistoryClient";

export const metadata: Metadata = {
  title: "Order History | Ladurée Thailand",
};

export default function OrderHistoryPage() {
  return <OrderHistoryClient />;
}
