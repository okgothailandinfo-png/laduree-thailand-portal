import type { Metadata } from "next";
import {
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  SITE_DESCRIPTION,
  SITE_NAME,
  defaultStorefrontRobots,
  getMetadataBaseUrl,
  isStorefrontIndexingLive,
} from "./indexing";

function absoluteUrl(path: string): string {
  const base = getMetadataBaseUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function storefrontRootMetadata(): Metadata {
  const robots = defaultStorefrontRobots();
  const canonical = absoluteUrl("/");
  return {
    metadataBase: new URL(getMetadataBaseUrl()),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    robots,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_TH",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: canonical,
    },
  };
}

export function transactionalPageMetadata(title: string): Metadata {
  return {
    title,
    robots: NOINDEX_ROBOTS,
    alternates: { canonical: undefined },
  };
}

export function publicPageMetadata(input: {
  title: string;
  path: string;
  description?: string;
  indexable?: boolean;
}): Metadata {
  const allowIndex =
    input.indexable !== false && isStorefrontIndexingLive();
  const url = absoluteUrl(input.path);
  const description = input.description ?? SITE_DESCRIPTION;
  return {
    title: input.title,
    description,
    robots: allowIndex ? INDEX_ROBOTS : NOINDEX_ROBOTS,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        "x-default": url,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_TH",
      siteName: SITE_NAME,
      title: `${input.title} | ${SITE_NAME}`,
      description,
      url,
    },
  };
}

export function productPageMetadata(input: {
  title: string;
  slug: string;
  description?: string | null;
  indexable: boolean;
}): Metadata {
  const url = absoluteUrl(`/product/${input.slug}`);
  const allowIndex = input.indexable && isStorefrontIndexingLive();
  const description = input.description?.trim() || undefined;
  return {
    title: input.title,
    ...(description ? { description } : {}),
    robots: allowIndex ? INDEX_ROBOTS : NOINDEX_ROBOTS,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        "x-default": url,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_TH",
      siteName: SITE_NAME,
      title: `${input.title} | ${SITE_NAME}`,
      ...(description ? { description } : {}),
      url,
    },
  };
}
