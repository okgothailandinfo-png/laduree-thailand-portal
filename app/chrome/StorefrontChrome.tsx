"use client";

import type { ReactNode } from "react";
import type { Category } from "@/lib/api/types";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function StorefrontChrome({
  children,
  categories,
  brandName,
  brandAsHeading,
}: {
  children: ReactNode;
  categories?: Category[];
  brandName?: string;
  brandAsHeading?: boolean;
}) {
  return (
    <div className="relative min-h-full flex-1 bg-page text-text storefront-chrome">
      <SiteHeader
        categories={categories}
        brandName={brandName}
        brandAsHeading={brandAsHeading}
      />
      {children}
      <SiteFooter />
    </div>
  );
}
