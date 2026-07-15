import type { Metadata } from "next";
import { SAMPLE_PRODUCT } from "../sample-product";
import ProductDetailClient from "./ProductDetailClient";

export function generateStaticParams() {
  return [{ slug: SAMPLE_PRODUCT.slug }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  await params;

  return {
    title: `${SAMPLE_PRODUCT.title} | Ladurée Thailand`,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
