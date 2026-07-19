import AdminNotificationDetailClient from "./AdminNotificationDetailClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminNotificationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  return <AdminNotificationDetailClient id={id} />;
}
