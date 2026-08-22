import StorefrontChrome from "../chrome/StorefrontChrome";
import CheckoutPageClient from "./CheckoutPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata = transactionalPageMetadata("Checkout");

export default function CheckoutPage() {
  return (
    <StorefrontChrome>
      <CheckoutPageClient />
    </StorefrontChrome>
  );
}
