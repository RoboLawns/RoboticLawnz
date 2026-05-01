"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { deleteMyAssessment, listMyAssessments } from "@/lib/me-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Assessment } from "@roboticlawnz/shared-types";

export default function MyYardsPage() {
  const getToken = useApiAuth();
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    listMyAssessments(getToken)
      .then(setAssessments)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Couldn't load your yards."),
      );
  };

  useEffect(() => {
    let cancelled = false;
    listMyAssessments(getToken)
      .then((a) => !cancelled && setAssessments(a))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Couldn't load your yards.");
      });
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const handleDelete = async (a: Assessment) => {
    if (!confirm(`Delete this assessment of ${a.address ?? "your yard"}? This cannot be undone.`))
      return;
    try {
      await deleteMyAssessment(a.id, getToken);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My yards</h1>
          <p className="text-stone-600">
            Saved assessments. Re-open one or start a new yard.
          </p>
        </div>
        <Button asChild>
          <Link href="/assessment">+ New assessment</Link>
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}

      <div className="mt-8">
        {!assessments ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-stone-200" />
            ))}
          </div>
        ) : assessments.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {assessments.map((a) => (
              <li
                key={a.id}
                className="rounded-[var(--radius-card)] border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      {a.status === "completed" ? "Completed" : "Draft"} ·{" "}
                      {new Date(a.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold">
                      {a.address ?? "(no address yet)"}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {a.lawn_area_sqft
                        ? `${Math.round(a.lawn_area_sqft).toLocaleString()} sq ft`
                        : "area not measured"}
                      {a.max_slope_pct != null && ` · ${Math.round(a.max_slope_pct)}% max slope`}
                      {a.grass_type_guesses?.[0]?.species &&
                        ` · ${a.grass_type_guesses[0].species}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "completed" ? (
                      <Button asChild variant="primary" size="sm">
                        <Link href={`/assessment/${a.id}/results`}>View matches</Link>
                      </Button>
                    ) : (
                      <Button asChild variant="primary" size="sm">
                        <Link href={`/assessment/${a.id}/address`}>Continue</Link>
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(a)}
                      aria-label="Delete assessment"
                      className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-stone-300 bg-white p-12 text-center">
      <p aria-hidden className="text-4xl">🌱</p>
      <h2 className="mt-3 text-xl font-semibold">No yards yet</h2>
      <p className="mt-2 text-stone-600">
        Run your first assessment to see your matches and save them here.
      </p>
      <div className="mt-6">
        <Button asChild size="lg">
          <Link href="/assessment">Start an assessment</Link>
        </Button>
      </div>
    </div>
  );
}
