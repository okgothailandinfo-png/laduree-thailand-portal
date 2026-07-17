import AdminResourceScaffold from "../../components/AdminResourceScaffold";

export default function AdminBannersPage() {
  return (
    <AdminResourceScaffold
      resourceKey="banners"
      title="Banners"
      description="Manage homepage and promotional banners."
      searchPlaceholder="Search banners…"
    />
  );
}
