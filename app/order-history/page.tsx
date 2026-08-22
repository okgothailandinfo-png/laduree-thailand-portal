import StorefrontChrome from "../chrome/StorefrontChrome";
import OrderHistoryClient from "./OrderHistoryClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata = transactionalPageMetadata("Order History");

export default function OrderHistoryPage() {
  return (
    <StorefrontChrome>
      <OrderHistoryClient />
    </StorefrontChrome>
  );
}
