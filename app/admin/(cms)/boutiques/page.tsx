import AdminResourceScaffold from "../../components/AdminResourceScaffold";

export default function AdminBoutiquesPage() {
  return (
    <AdminResourceScaffold
      resourceKey="boutiques"
      title="Boutiques"
      description="Manage boutique locations and hours."
      searchPlaceholder="Search boutiques…"
    />
  );
}
