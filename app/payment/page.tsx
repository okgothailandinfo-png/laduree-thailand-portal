import type { Metadata } from "next";
import PaymentPageClient from "./PaymentPageClient";

export const metadata: Metadata = {
  title: "Payment | Ladurée Thailand",
};

export default function PaymentPage() {
  return <PaymentPageClient />;
}
