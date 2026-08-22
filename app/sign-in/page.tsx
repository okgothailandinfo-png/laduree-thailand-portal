import StorefrontChrome from "../chrome/StorefrontChrome";
import SignInPageClient from "./SignInPageClient";
import { transactionalPageMetadata } from "@/lib/seo/metadata";

export const metadata = transactionalPageMetadata("Sign In");

export default function SignInPage() {
  return (
    <StorefrontChrome>
      <SignInPageClient />
    </StorefrontChrome>
  );
}
