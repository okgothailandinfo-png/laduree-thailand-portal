import type {
  HomepageBannerRepository,
  HomepageContentRepository,
  HomepageSectionRepository,
} from "@/src/server/repositories/interfaces";

/** Storefront-safe homepage DTO (no admin-only fields / raw Prisma). */
export type StorefrontHomepageBannerDto = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  altText: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
};

export type StorefrontHomepageSectionDto = {
  key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  sortOrder: number;
};

export type StorefrontHomepageContentDto = {
  key: string;
  value: string;
  contentType: "plain_text" | "multiline_text" | "url" | "boolean";
};

export type StorefrontHomepageDto = {
  banners: StorefrontHomepageBannerDto[];
  sections: StorefrontHomepageSectionDto[];
  content: StorefrontHomepageContentDto[];
};

export class DefaultHomepageService {
  constructor(
    private readonly banners: HomepageBannerRepository,
    private readonly sections: HomepageSectionRepository,
    private readonly content: HomepageContentRepository,
  ) {}

  async getHomepage(now: Date = new Date()): Promise<StorefrontHomepageDto> {
    const [banners, sections, content] = await Promise.all([
      this.banners.listActiveForStorefront(now),
      this.sections.listActiveForStorefront(),
      this.content.listActiveForStorefront(),
    ]);

    return {
      banners: banners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        mobileImageUrl: banner.mobileImageUrl,
        altText: banner.imageAltText ?? banner.title,
        linkUrl: banner.linkUrl,
        linkLabel: banner.linkLabel,
        sortOrder: banner.sortOrder,
      })),
      sections: sections.map((section) => ({
        key: section.key,
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        sortOrder: section.sortOrder,
      })),
      content: content.map((item) => ({
        key: item.key,
        value: item.value,
        contentType: item.contentType,
      })),
    };
  }
}
