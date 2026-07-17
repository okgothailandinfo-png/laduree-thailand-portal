import AdminShell from "../components/AdminShell";

export default function AdminCmsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}
