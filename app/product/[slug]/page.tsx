import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import StorefrontChrome from "../../chrome/StorefrontChrome";
import { NOINDEX_ROBOTS } from "@/lib/seo/indexing";
import { productPageMetadata } from "@/lib/seo/metadata";
import { productService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return [] as Array<{ slug: string }>;
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await productService.getProductBySlug(slug);
    return productPageMetadata({
      title: product.title,
      slug: product.slug,
      description: product.description[0] ?? null,
      indexable: product.available && product.priceThb !== null,
    });
  } catch {
    return {
      title: "Product",
      robots: NOINDEX_ROBOTS,
    };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  try {
    await productService.getProductBySlug(slug);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <StorefrontChrome>
      <ProductDetailClient key={slug} slug={slug} />
    </StorefrontChrome>
  );
}
