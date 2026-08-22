import { AllItemsBrowse } from "./CategoryBrowseClient";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "All Items",
  path: "/Category",
  indexable: true,
});

export default function AllItemsPage() {
  return <AllItemsBrowse />;
}
