import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OKGO Pickup",
  description: "Order in advance and collect at your preferred boutique.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-serif">{children}</body>
    </html>
  );
}
