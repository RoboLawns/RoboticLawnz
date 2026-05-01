import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/me");
  }
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </>
  );
}
