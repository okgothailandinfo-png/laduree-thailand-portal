import StorefrontChrome from "../chrome/StorefrontChrome";
import AccountPageClient from "./AccountPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata = transactionalPageMetadata("My Account");

export default function AccountPage() {
  return (
    <StorefrontChrome>
      <AccountPageClient />
    </StorefrontChrome>
  );
}
