import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Server-side gate: redirect unauthenticated users to sign-in.
 *
 * Role enforcement (admin) is done by the API on every /admin/* call. We
 * surface a friendly 403 message in the page bodies if the API rejects.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/mowers");
  }
  return <AdminShell>{children}</AdminShell>;
}
