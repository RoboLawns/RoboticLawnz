"use client";

import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { LeadCaptureDialog } from "@/components/results/lead-capture-dialog";
import { MowerCard } from "@/components/results/mower-card";
import { RoiCalculator } from "@/components/roi/roi-calculator";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { getAssessment, getRecommendations } from "@/lib/assessment-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Assessment, RecommendationWithMower } from "@zippylawnz/shared-types";

type TabKey = "green" | "yellow" | "red";

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const getToken = useApiAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [recs, setRecs] = useState<RecommendationWithMower[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAssessment(id, getToken), getRecommendations(id, getToken)])
      .then(([a, r]) => {
        if (cancelled) return;
        setAssessment(a);
        setRecs(r);
        const counts = r.reduce(
          (acc, rec) => ({ ...acc, [rec.fit_status]: (acc[rec.fit_status] ?? 0) + 1 }),
          {} as Record<string, number>,
        );
        track("recommendations_viewed", {
          assessment_id: id,
          green_count: counts.green ?? 0,
          yellow_count: counts.yellow ?? 0,
          red_count: counts.red ?? 0,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Couldn't load your results.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, getToken]);

  const grouped = useMemo(() => {
    const out: Record<TabKey, RecommendationWithMower[]> = { green: [], yellow: [], red: [] };
    for (const r of recs ?? []) out[r.fit_status].push(r);
    return out;
  }, [recs]);

  const yardSummary = assessment
    ? [
        {
          label: "Area",
          value: assessment.lawn_area_sqft
            ? `${Math.round(assessment.lawn_area_sqft).toLocaleString()} sq ft`
            : "—",
        },
        {
          label: "Max slope",
          value:
            assessment.max_slope_pct != null ? `${Math.round(assessment.max_slope_pct)}%` : "—",
        },
        {
          label: "Grass",
          value: assessment.grass_type_guesses?.[0]?.species ?? "—",
        },
        {
          label: "Gates",
          value: assessment.gates?.length
            ? `${assessment.gates.length} (${Math.min(
                ...assessment.gates.map((g) => g.width_inches),
              )}" min)`
            : "None",
        },
        {
          label: "Obstacles",
          value: `${assessment.obstacles?.length ?? 0} tagged`,
        },
      ]
    : [];

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Couldn&apos;t load your results</h1>
        <p className="mt-3 text-stone-700">{error}</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-stone-50 pb-32">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span aria-hidden className="text-2xl">🌿</span>
            <span>ZippyLawnz</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/assessment/${id}/review`}>Edit assessment</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">
            Your matches
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {recs?.length
              ? `${grouped.green.length} mower${grouped.green.length === 1 ? "" : "s"} will work for your yard`
              : "Computing your recommendations…"}
          </h1>
        </section>

        {assessment && (
          <section className="mt-6 rounded-[var(--radius-card)] border border-stone-200 bg-white p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {yardSummary.map((s) => (
                <div key={s.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-stone-900">{s.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          {!recs ? (
            <SkeletonGrid />
          ) : (
            <Tabs.Root defaultValue="green" className="w-full">
              <Tabs.List
                aria-label="Recommendation groups"
                className="flex flex-wrap gap-2 rounded-full bg-stone-100 p-1"
              >
                <TabTrigger value="green" count={grouped.green.length}>
                  ✅ Will work
                </TabTrigger>
                <TabTrigger value="yellow" count={grouped.yellow.length}>
                  ⚠️ Borderline
                </TabTrigger>
                <TabTrigger value="red" count={grouped.red.length}>
                  ❌ Not recommended
                </TabTrigger>
              </Tabs.List>

              {(["green", "yellow", "red"] as TabKey[]).map((key) => (
                <Tabs.Content key={key} value={key} className="mt-6 space-y-4">
                  {grouped[key].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
                      Nothing in this group.
                    </p>
                  ) : (
                    grouped[key].map((rec, i) => (
                      <MowerCard key={rec.id} rec={rec} defaultOpen={i === 0 && key === "green"} />
                    ))
                  )}
                </Tabs.Content>
              ))}
            </Tabs.Root>
          )}
        </section>

        {assessment && (() => {
            const top = recs?.[0];
            return (
          <section className="mx-auto mt-8 max-w-lg px-4 sm:px-6">
            <RoiCalculator
              compact
              mowerPrice={top?.mower.price_usd ?? 2000}
              mowerName={
                top ? `${top.mower.brand} ${top.mower.model}` : undefined
              }
              defaultMonthlySpend={150}
              defaultHoursPerWeek={2}
              assessmentId={id}
            />
          </section>
            );
          })()}

        {/* Spacer so the fixed bottom bar doesn't cover content */}
        <div className="h-24" />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="hidden text-sm text-stone-700 sm:block">
            Want help picking, buying, and installing? ZippyLawnz handles the rest.
          </p>
          <LeadCaptureDialog
            assessmentId={id}
            trigger={<Button size="lg">Get a free consultation</Button>}
          />
        </div>
      </div>
    </div>
  );
}

function TabTrigger({
  value,
  count,
  children,
}: {
  value: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm"
    >
      {children}
      <span className="ml-1.5 text-stone-500 data-[state=active]:text-stone-700">({count})</span>
    </Tabs.Trigger>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-[var(--radius-card)] border border-stone-200 bg-white"
        />
      ))}
    </div>
  );
}
