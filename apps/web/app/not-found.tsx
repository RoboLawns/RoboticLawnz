import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">404</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">This patch of grass isn&apos;t here.</h1>
        <p className="mt-4 text-stone-700">
          The page you&apos;re looking for has wandered off. Let&apos;s get you back on track.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
