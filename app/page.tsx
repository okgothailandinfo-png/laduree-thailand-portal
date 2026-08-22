import HomePageClient from "./HomePageClient";
import { SITE_NAME } from "@/lib/seo/indexing";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = {
  ...publicPageMetadata({
    title: SITE_NAME,
    path: "/",
    indexable: true,
  }),
  title: { absolute: SITE_NAME },
};

export default function HomePage() {
  return <HomePageClient />;
}
