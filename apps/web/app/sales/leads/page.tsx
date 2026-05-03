"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LEAD_STATUSES, LEAD_STATUS_LABELS, StatusPill } from "@/components/sales/status-pill";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { listLeads, type Page } from "@/lib/sales-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Lead, LeadStatus } from "@zippylawnz/shared-types";

const PAGE_SIZE = 25;

export default function SalesLeadsPage() {
  const getToken = useApiAuth();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("new");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<Page<Lead> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listLeads(
      {
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: PAGE_SIZE,
        offset,
      },
      getToken,
    )
      .then((p) => {
        if (cancelled) return;
        setPage(p);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 403
            ? "Your account doesn't have sales-rep access. Ask an admin to grant the role."
            : e instanceof ApiError
              ? e.message
              : "Couldn't load leads.",
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [statusFilter, offset, getToken]);

  const totalPages = useMemo(
    () => (page ? Math.max(1, Math.ceil(page.meta.total / PAGE_SIZE)) : 1),
    [page],
  );
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-stone-600">
            Homeowners who completed an assessment and asked for help.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="status" className="text-sm font-medium text-stone-700">
            Status
          </label>
          <Select
            id="status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as LeadStatus | "all");
              setOffset(0);
            }}
            className="h-10 w-44"
          >
            <option value="all">All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
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
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 hidden sm:table-cell">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden md:table-cell">Created</th>
              <th className="px-4 py-3 text-right">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {loading && !page ? (
              <SkeletonRows />
            ) : page && page.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-stone-600">
                  No leads in this status.
                </td>
              </tr>
            ) : (
              page?.items.map((lead) => (
                <tr key={lead.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium">{lead.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-stone-600">
                    {lead.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={lead.zippylawnz_status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-stone-600">
                    {new Date(lead.created_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/sales/leads/${lead.id}`}
                      className="font-medium text-leaf-700 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page && page.meta.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
          <p>
            Page {currentPage} of {totalPages} · {page.meta.total.toLocaleString()} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= page.meta.total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-4">
            <div className="h-3 w-48 rounded bg-stone-200" />
          </td>
          <td className="px-4 py-4 hidden sm:table-cell">
            <div className="h-3 w-32 rounded bg-stone-200" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 w-16 rounded-full bg-stone-200" />
          </td>
          <td className="px-4 py-4 hidden md:table-cell">
            <div className="h-3 w-28 rounded bg-stone-200" />
          </td>
          <td className="px-4 py-4 text-right">
            <div className="ml-auto h-3 w-12 rounded bg-stone-200" />
          </td>
        </tr>
      ))}
    </>
  );
}
