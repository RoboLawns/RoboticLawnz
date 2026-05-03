"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { listPublicMowers, type MowerListParams } from "@/lib/mower-client";
import type { Page } from "@/lib/sales-client";
import type { DriveType, Mower, NavigationType } from "@zippylawnz/shared-types";

const NAV_LABELS: Record<NavigationType, string> = {
  wire: "Boundary wire",
  rtk: "RTK GPS",
  vision: "Vision / camera",
  lidar: "LiDAR",
  hybrid: "Hybrid",
};

const DRIVE_LABELS: Record<DriveType, string> = {
  "2wd": "2WD",
  awd: "AWD",
  tracks: "Tracks",
};

export default function MowersCatalogPage() {
  const [params, setParams] = useState<MowerListParams>({ limit: 24, offset: 0 });
  const [page, setPage] = useState<Page<Mower> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Local input mirrors the search box; the actual `params.q` only updates on
  // submit so we don't fire a request on every keystroke.
  const [searchDraft, setSearchDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPublicMowers(params)
      .then((p) => !cancelled && setPage(p))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Couldn't load mowers.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const m of page?.items ?? []) set.add(m.brand);
    return [...set].sort();
  }, [page]);

  const updateFilter = (key: keyof MowerListParams, value: string | number | undefined) =>
    setParams((p) => ({ ...p, [key]: value === "" ? undefined : value, offset: 0 }));

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-leaf-50 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">
              Mower catalog
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Every mower we&apos;ll match against your yard.
            </h1>
            <p className="mt-3 max-w-2xl text-stone-700">
              Browse the catalog or jump straight into an assessment to see which ones actually fit
              your lawn, slope, and gates.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link href="/assessment">Start your assessment</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-b border-stone-200 bg-white py-6">
          <form
            className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              updateFilter("q", searchDraft.trim() || undefined);
            }}
          >
            <div className="lg:col-span-2">
              <Input
                placeholder="Search brand or model…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                aria-label="Search"
              />
            </div>
            <Select
              value={params.brand ?? ""}
              onChange={(e) => updateFilter("brand", e.target.value || undefined)}
              aria-label="Brand"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
            <Select
              value={params.nav ?? ""}
              onChange={(e) => updateFilter("nav", e.target.value || undefined)}
              aria-label="Navigation"
            >
              <option value="">Any navigation</option>
              {(Object.keys(NAV_LABELS) as NavigationType[]).map((k) => (
                <option key={k} value={k}>
                  {NAV_LABELS[k]}
                </option>
              ))}
            </Select>
            <Select
              value={params.drive ?? ""}
              onChange={(e) => updateFilter("drive", e.target.value || undefined)}
              aria-label="Drive type"
            >
              <option value="">Any drive</option>
              {(Object.keys(DRIVE_LABELS) as DriveType[]).map((k) => (
                <option key={k} value={k}>
                  {DRIVE_LABELS[k]}
                </option>
              ))}
            </Select>
          </form>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {error ? (
              <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
                {error}
              </p>
            ) : loading && !page ? (
              <SkeletonGrid />
            ) : page && page.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-600">
                No mowers match your filters.
              </p>
            ) : (
              <>
                <p className="text-sm text-stone-600">
                  {page?.meta.total.toLocaleString()} mowers
                </p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {page?.items.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/mowers/${m.slug}` as never}
                        className="group block rounded-[var(--radius-card)] border border-stone-200 bg-white p-5 shadow-sm transition hover:border-leaf-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                              {m.brand}
                            </p>
                            <h2 className="mt-0.5 truncate text-lg font-semibold text-stone-900 group-hover:text-leaf-700">
                              {m.model}
                            </h2>
                          </div>
                          <p className="whitespace-nowrap text-lg font-bold tabular-nums">
                            ${m.price_usd.toLocaleString()}
                          </p>
                        </div>
                        <ul className="mt-3 grid grid-cols-3 gap-2 text-xs text-stone-600">
                          <li className="rounded-lg bg-stone-50 p-2">
                            <p className="font-semibold text-stone-900">
                              {m.max_area_sqft.toLocaleString()}
                            </p>
                            <p>sq ft</p>
                          </li>
                          <li className="rounded-lg bg-stone-50 p-2">
                            <p className="font-semibold text-stone-900">{m.max_slope_pct}%</p>
                            <p>slope</p>
                          </li>
                          <li className="rounded-lg bg-stone-50 p-2">
                            <p className="font-semibold text-stone-900">
                              {DRIVE_LABELS[m.drive_type]}
                            </p>
                            <p>drive</p>
                          </li>
                        </ul>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-[var(--radius-card)] border border-stone-200 bg-white"
        />
      ))}
    </div>
  );
}
