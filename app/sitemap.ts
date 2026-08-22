import type { MetadataRoute } from "next";
import { categoryPath } from "@/lib/catalog/storefront-visibility";
import { getMetadataBaseUrl, isStorefrontIndexingLive } from "@/lib/seo/indexing";
import { categoryService, productService } from "@/src/server/services/container";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isStorefrontIndexingLive()) {
    return [];
  }

  const base = getMetadataBaseUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/Category`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const [categories, indexable] = await Promise.all([
    categoryService.listCategories(),
    productService.listIndexableProducts(),
  ]);

  for (const category of categories) {
    if (category.slug === "all-items") continue;
    entries.push({
      url: `${base}${categoryPath(category.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const product of indexable) {
    entries.push({
      url: `${base}/product/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
