import AdminResourceScaffold from "../../components/AdminResourceScaffold";

export default function AdminCategoriesPage() {
  return (
    <AdminResourceScaffold
      resourceKey="categories"
      title="Categories"
      description="Manage menu categories."
      searchPlaceholder="Search categories…"
    />
  );
}
