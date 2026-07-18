export type HomepageContentType =
  | "plain_text"
  | "multiline_text"
  | "url"
  | "boolean";

export type HomepageBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageMediaId: string;
  mobileImageMediaId: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HomepageBannerWithMedia = HomepageBanner & {
  imageUrl: string;
  imageAltText: string | null;
  mobileImageUrl: string | null;
  mobileImageAltText: string | null;
};

export type HomepageSection = {
  id: string;
  key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HomepageContent = {
  id: string;
  key: string;
  value: string;
  contentType: HomepageContentType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
