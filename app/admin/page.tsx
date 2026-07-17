import { redirect } from "next/navigation";

/** /admin entry — proxy also redirects; this covers direct server renders. */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
