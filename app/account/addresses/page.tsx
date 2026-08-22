import StorefrontChrome from "../../chrome/StorefrontChrome";
import SavedAddressesPageClient from "./SavedAddressesPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata = transactionalPageMetadata("Saved Addresses");

export default function SavedAddressesPage() {
  return (
    <StorefrontChrome>
      <SavedAddressesPageClient />
    </StorefrontChrome>
  );
}
