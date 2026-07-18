import AdminOrderDetailClient from "./AdminOrderDetailClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminOrderDetailClient orderId={id} />;
}
