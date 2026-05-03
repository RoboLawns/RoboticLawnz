"use client";

import { BarChart3, Clock, ListChecks, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { deleteMyAssessment, listMyAssessments } from "@/lib/me-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Assessment } from "@zippylawnz/shared-types";

export default function DashboardPage() {
  const getToken = useApiAuth();
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    listMyAssessments(getToken)
      .then(setAssessments)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load assessments."));
  };

  useEffect(() => {
    let cancelled = false;
    listMyAssessments(getToken)
      .then((a) => !cancelled && setAssessments(a))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Couldn't load assessments.");
      });
    return () => { cancelled = true; };
  }, [getToken]);

  const handleDelete = async (a: Assessment) => {
    if (!confirm(`Delete assessment of ${a.address ?? "your yard"}?`)) return;
    try {
      await deleteMyAssessment(a.id, getToken);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete.");
    }
  };

  const stats = useMemo(() => {
    if (!assessments) return null;
    const drafts = assessments.filter((a) => a.status === "draft").length;
    const completed = assessments.filter((a) => a.status === "completed").length;
    const totalSqft = assessments.reduce((sum, a) => sum + (a.lawn_area_sqft ?? 0), 0);
    return { total: assessments.length, drafts, completed, totalSqft };
  }, [assessments]);

  const drafts = useMemo(
    () => assessments?.filter((a) => a.status === "draft") ?? [],
    [assessments],
  );
  const completed = useMemo(
    () => assessments?.filter((a) => a.status === "completed") ?? [],
    [assessments],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your yard assessments and view recommendations.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/assessment">
            <Plus className="mr-1.5 h-4 w-4" />
            New assessment
          </Link>
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      {stats && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<ListChecks className="h-5 w-5" />}
            label="Total"
            value={stats.total}
            color="stone"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="In progress"
            value={stats.drafts}
            color="amber"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Completed"
            value={stats.completed}
            color="leaf"
          />
          <StatCard
            label="Total sq ft"
            value={stats.totalSqft > 0 ? `${Math.round(stats.totalSqft).toLocaleString()}` : "—"}
            color="emerald"
          />
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {!assessments && (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-200" />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {assessments && assessments.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <p aria-hidden className="text-4xl">🌿</p>
          <h2 className="mt-3 text-xl font-semibold">Welcome to your dashboard</h2>
          <p className="mt-2 text-sm text-stone-500">
            Run your first yard assessment to get personalized robotic mower recommendations.
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href="/assessment">Start your first assessment</Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── In-progress ─────────────────────────────────────────────── */}
      {drafts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900">
            In progress ({drafts.length})
          </h2>
          <p className="mb-4 text-sm text-stone-500">
            Continue where you left off.
          </p>
          <div className="space-y-3">
            {drafts.map((a) => (
              <AssessmentCard
                key={a.id}
                assessment={a}
                actionLabel="Continue"
                actionHref={`/assessment/${a.id}/address`}
                onDelete={() => handleDelete(a)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Completed ───────────────────────────────────────────────── */}
      {completed.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900">
            Completed ({completed.length})
          </h2>
          <p className="mb-4 text-sm text-stone-500">
            View your results and recommendations.
          </p>
          <div className="space-y-3">
            {completed.map((a) => (
              <AssessmentCard
                key={a.id}
                assessment={a}
                actionLabel="View results"
                actionHref={`/assessment/${a.id}/results`}
                onDelete={() => handleDelete(a)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
  color: "stone" | "amber" | "leaf" | "emerald";
}) {
  const colors = {
    stone: "border-stone-200 bg-white text-stone-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    leaf: "border-leaf-200 bg-leaf-50 text-leaf-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="opacity-70">{icon}</span>}
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AssessmentCard({
  assessment: a,
  actionLabel,
  actionHref,
  onDelete,
}: {
  assessment: Assessment;
  actionLabel: string;
  actionHref: string;
  onDelete: () => void;
}) {
  const progress = useMemo(() => {
    if (a.status === "completed") return 100;
    let steps = 0;
    if (a.address) steps++;
    if (a.lawn_area_sqft) steps++;
    if (a.max_slope_pct != null) steps++;
    if (a.grass_type_guesses?.length) steps++;
    if (a.obstacles?.length || a.gates?.length) steps++;
    return Math.round((steps / 5) * 100);
  }, [a]);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                a.status === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {a.status === "completed" ? "Done" : "Draft"}
            </span>
            <span className="text-xs text-stone-400">
              {new Date(a.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <h3 className="mt-1.5 truncate text-base font-semibold text-stone-900">
            {a.address ?? "(no address)"}
          </h3>

          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            {a.lawn_area_sqft && (
              <span>{Math.round(a.lawn_area_sqft).toLocaleString()} sq ft</span>
            )}
            {a.max_slope_pct != null && (
              <span>{Math.round(a.max_slope_pct)}% slope</span>
            )}
            {a.grass_type_guesses?.[0]?.species &&
              a.grass_type_guesses[0].species !== "I'm not sure" && (
                <span>{a.grass_type_guesses[0].species}</span>
              )}
            {a.gates?.length && a.gates.length > 0 && (
              <span>{a.gates.length} gate{a.gates.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {a.status === "draft" && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-stone-100">
                <div
                  className="h-1.5 rounded-full bg-leaf-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-stone-400">{progress}% complete</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="primary" size="sm">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
          <button
            onClick={onDelete}
            aria-label="Delete assessment"
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-rose-600 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
