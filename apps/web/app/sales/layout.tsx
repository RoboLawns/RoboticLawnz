import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SalesShell } from "@/components/sales/sales-shell";

/**
 * Server-side gate: redirect to Clerk sign-in if signed out.
 *
 * Role enforcement (sales_rep | admin) lives on the API — every endpoint
 * under /sales/* re-checks via Clerk publicMetadata. This layout only
 * blocks unauthenticated access; signed-in users without the role will see
 * the dashboard chrome but every API call returns 403, and we render that
 * gracefully via the error states on each page.
 */
export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/sales/leads");
  }
  return <SalesShell>{children}</SalesShell>;
}
