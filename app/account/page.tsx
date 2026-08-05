import type { Metadata } from "next";
import AccountPageClient from "./AccountPageClient";

export const metadata: Metadata = {
  title: "My Account | Ladurée Thailand",
};

export default function AccountPage() {
  return <AccountPageClient />;
}
