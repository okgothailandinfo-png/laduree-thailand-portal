import { notFound } from "next/navigation";
import { CategoryBrowse } from "../CategoryBrowseClient";
import { publicPageMetadata } from "@/lib/seo/metadata";
import { categoryService } from "@/src/server/services/container";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "all-items") {
    return publicPageMetadata({
      title: "All Items",
      path: "/Category",
      indexable: true,
    });
  }
  const categories = await categoryService.listCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) {
    return publicPageMetadata({
      title: "All Items",
      path: `/Category/${slug}`,
      indexable: false,
    });
  }
  return publicPageMetadata({
    title: category.name,
    path: `/Category/${category.slug}`,
    indexable: true,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const categories = await categoryService.listCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category || slug === "all-items") {
    notFound();
  }
  return <CategoryBrowse slug={category.slug} title={category.name} />;
}
