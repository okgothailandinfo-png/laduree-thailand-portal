import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPublicPreview } from "@/lib/preview/public-preview";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin | Ladurée Thailand",
  description: "Ladurée Thailand Admin CMS",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isPublicPreview()) {
    notFound();
  }
  return <div className="admin-root">{children}</div>;
}
