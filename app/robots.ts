import type { MetadataRoute } from "next";
import {
  TRANSACTIONAL_ROBOTS_DISALLOW,
  getMetadataBaseUrl,
  isStorefrontIndexingLive,
} from "@/lib/seo/indexing";

export default function robots(): MetadataRoute.Robots {
  const base = getMetadataBaseUrl();

  if (!isStorefrontIndexingLive()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: base,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...TRANSACTIONAL_ROBOTS_DISALLOW],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
