"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { deleteMower, listAdminMowers } from "@/lib/admin-client";
import type { Page } from "@/lib/sales-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Mower } from "@roboticlawnz/shared-types";

export default function AdminMowersList() {
  const getToken = useApiAuth();
  const [page, setPage] = useState<Page<Mower> | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(true);

  const reload = () => {
    listAdminMowers({ q: q || undefined, include_inactive: includeInactive, limit: 200 }, getToken)
      .then(setPage)
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 403
            ? "Your account doesn't have admin access."
            : e instanceof ApiError
              ? e.message
              : "Couldn't load mowers.",
        ),
      );
  };

  useEffect(() => {
    let cancelled = false;
    setError(null);
    listAdminMowers({ q: q || undefined, include_inactive: includeInactive, limit: 200 }, getToken)
      .then((p) => !cancelled && setPage(p))
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 403
            ? "Your account doesn't have admin access."
            : e instanceof ApiError
              ? e.message
              : "Couldn't load mowers.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [q, includeInactive, getToken]);

  const handleDelete = async (m: Mower) => {
    if (!confirm(`Soft-delete ${m.brand} ${m.model}? It will be hidden from recommendations.`))
      return;
    try {
      await deleteMower(m.id, getToken);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mower catalog</h1>
          <p className="text-sm text-stone-600">
            {page ? `${page.meta.total.toLocaleString()} total` : "Loading…"} · seed and CSV import
            from <code>scripts/seed_mowers.py</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
            Show inactive
          </label>
          <Button asChild>
            <Link href="/admin/mowers/new">+ New mower</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 max-w-md">
        <Input
          placeholder="Search by brand, model, or slug…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="px-4 py-3">Brand / model</th>
              <th className="px-4 py-3 hidden sm:table-cell">Price</th>
              <th className="px-4 py-3 hidden md:table-cell">Max area</th>
              <th className="px-4 py-3 hidden md:table-cell">Slope</th>
              <th className="px-4 py-3 hidden lg:table-cell">Drive / Nav</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {page?.items.map((m) => (
              <tr key={m.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {m.brand} {m.model}
                  </div>
                  <div className="text-xs text-stone-500">{m.slug}</div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell tabular-nums">
                  ${m.price_usd.toLocaleString()}
                </td>
                <td className="px-4 py-3 hidden md:table-cell tabular-nums">
                  {m.max_area_sqft.toLocaleString()} sf
                </td>
                <td className="px-4 py-3 hidden md:table-cell tabular-nums">
                  {m.max_slope_pct}%
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-stone-600">
                  {m.drive_type.toUpperCase()} · {m.navigation_type.toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  {m.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-leaf-50 px-2 py-0.5 text-xs font-medium text-leaf-800 ring-1 ring-leaf-200">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/mowers/${m.id}`}
                    className="font-medium text-leaf-700 hover:underline"
                  >
                    Edit
                  </Link>
                  {m.is_active && (
                    <button
                      onClick={() => handleDelete(m)}
                      className="ml-3 font-medium text-rose-600 hover:underline"
                    >
                      Hide
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {page && page.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-stone-600">
                  No mowers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
