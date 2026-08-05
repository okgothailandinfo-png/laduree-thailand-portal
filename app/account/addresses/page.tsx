import type { Metadata } from "next";
import SavedAddressesPageClient from "./SavedAddressesPageClient";

export const metadata: Metadata = {
  title: "Saved Addresses | Ladurée Thailand",
};

export default function SavedAddressesPage() {
  return <SavedAddressesPageClient />;
}
