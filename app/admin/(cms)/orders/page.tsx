import AdminResourceScaffold from "../../components/AdminResourceScaffold";

export default function AdminOrdersPage() {
  return (
    <AdminResourceScaffold
      resourceKey="orders"
      title="Orders"
      description="Review pickup orders."
      searchPlaceholder="Search orders…"
    />
  );
}
