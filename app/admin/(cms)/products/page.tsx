import AdminResourceScaffold from "../../components/AdminResourceScaffold";

export default function AdminProductsPage() {
  return (
    <AdminResourceScaffold
      resourceKey="products"
      title="Products"
      description="Manage product catalogue content."
      searchPlaceholder="Search products…"
    />
  );
}
