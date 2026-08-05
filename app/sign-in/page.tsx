import type { Metadata } from "next";
import SignInPageClient from "./SignInPageClient";

export const metadata: Metadata = {
  title: "Sign In | Ladurée Thailand",
};

export default function SignInPage() {
  return <SignInPageClient />;
}
