import AdminPageHeader from "../../components/AdminPageHeader";

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Overview of Ladurée Thailand pickup content. Metrics will connect in a later sprint."
      />
      <div className="admin-dashboard-grid">
        <article className="admin-stat">
          <p className="admin-stat__label">Products</p>
          <p className="admin-stat__value">—</p>
          <p className="admin-stat__hint">Pending data connection</p>
        </article>
        <article className="admin-stat">
          <p className="admin-stat__label">Orders</p>
          <p className="admin-stat__value">—</p>
          <p className="admin-stat__hint">Pending data connection</p>
        </article>
        <article className="admin-stat">
          <p className="admin-stat__label">Boutiques</p>
          <p className="admin-stat__value">—</p>
          <p className="admin-stat__hint">Pending data connection</p>
        </article>
      </div>
    </>
  );
}
