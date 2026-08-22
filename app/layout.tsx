import type { Metadata } from "next";
import { Lora } from "next/font/google";
import { storefrontRootMetadata } from "@/lib/seo/metadata";
import SkipToContent from "./a11y/SkipToContent";
import CartProviderShell from "./cart/CartProviderShell";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = storefrontRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${lora.variable}`}>
      <body className="min-h-full flex flex-col font-sans">
        <SkipToContent />
        <CartProviderShell>{children}</CartProviderShell>
      </body>
    </html>
  );
}
