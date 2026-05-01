"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MowerSpecGrid } from "@/components/mowers/mower-spec-grid";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { getPublicMower } from "@/lib/mower-client";
import type { Mower } from "@roboticlawnz/shared-types";

export default function MowerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [mower, setMower] = useState<Mower | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicMower(slug)
      .then((m) => !cancelled && setMower(m))
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 404
            ? "We couldn't find that mower."
            : e instanceof ApiError
              ? e.message
              : "Couldn't load mower.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">404</p>
          <h1 className="mt-2 text-3xl font-bold">{error}</h1>
          <div className="mt-6">
            <Button asChild>
              <Link href="/mowers">Back to catalog</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!mower) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="h-10 w-2/3 animate-pulse rounded bg-stone-200" />
          <div className="mt-6 h-72 animate-pulse rounded-xl bg-stone-200" />
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          href="/mowers"
          className="text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
        >
          ← Back to catalog
        </Link>

        <div className="mt-3 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-[var(--radius-card)] bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mower.image_url}
              alt={`${mower.brand} ${mower.model}`}
              className="aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover"
              loading="lazy"
            />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              {mower.brand}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{mower.model}</h1>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              ${mower.price_usd.toLocaleString()}{" "}
              <span className="text-base font-medium text-stone-500">USD</span>
            </p>
            <p className="mt-4 text-stone-700">
              Best fit for yards up to{" "}
              <strong>{mower.max_area_sqft.toLocaleString()} sq ft</strong> with slopes up to{" "}
              <strong>{mower.max_slope_pct}%</strong>. Needs at least{" "}
              <strong>{mower.min_passage_inches}&quot; gate</strong> clearance to reach all zones.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/assessment">Check fit for my yard</Link>
              </Button>
              {mower.affiliate_url ? (
                <Button asChild variant="outline" size="lg">
                  <a href={mower.affiliate_url} target="_blank" rel="sponsored noreferrer">
                    Buy via partner
                  </a>
                </Button>
              ) : (
                <Button asChild variant="outline" size="lg">
                  <a href={mower.product_url} target="_blank" rel="noreferrer">
                    Manufacturer page
                  </a>
                </Button>
              )}
            </div>
            {mower.affiliate_url && (
              <p className="mt-2 text-[11px] text-stone-500">
                Affiliate link — we may earn a small commission at no extra cost to you. See our{" "}
                <Link href="/legal/privacy" className="underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Specifications</h2>
          <div className="mt-4">
            <MowerSpecGrid mower={mower} />
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Last updated {new Date(mower.data_updated_at).toLocaleDateString()}. Verified against{" "}
            <a
              href={mower.manufacturer_specs_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-leaf-700 underline-offset-4 hover:underline"
            >
              {mower.brand}&apos;s spec sheet
            </a>
            .
          </p>
        </section>

        <section className="mt-12 rounded-[var(--radius-card)] border border-stone-200 bg-leaf-50 p-6 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">
            Will the {mower.model} actually work for your yard?
          </h2>
          <p className="mt-2 max-w-2xl text-stone-700">
            Specs are advisory. Run a quick assessment and we&apos;ll tell you if your slope, gates,
            and area fit this mower&apos;s envelope — with reasons.
          </p>
          <div className="mt-5">
            <Button asChild size="lg">
              <Link href="/assessment">Start your assessment</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
