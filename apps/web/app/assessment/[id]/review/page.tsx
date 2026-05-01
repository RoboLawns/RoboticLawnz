"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { completeAssessment, getAssessment } from "@/lib/assessment-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Assessment } from "@roboticlawnz/shared-types";

export default function ReviewStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAssessment(id, getToken)
      .then(setAssessment)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load assessment."));
  }, [id, getToken]);

  const handleComplete = async () => {
    setError(null);
    try {
      await completeAssessment(id, getToken);
      track("review_completed", { assessment_id: id });
      router.push(`/assessment/${id}/results`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't compute recommendations. Try again.");
    }
  };

  const fields = assessment
    ? [
        { label: "Address", value: assessment.address ?? "—" },
        {
          label: "Lawn area",
          value: assessment.lawn_area_sqft
            ? `${Math.round(assessment.lawn_area_sqft).toLocaleString()} sq ft`
            : "—",
        },
        {
          label: "Max slope",
          value: assessment.max_slope_pct != null ? `${Math.round(assessment.max_slope_pct)}%` : "—",
        },
        {
          label: "Grass type",
          value: assessment.grass_type_guesses?.[0]?.species ?? "—",
        },
        {
          label: "Gates",
          value: assessment.gates?.length
            ? `${assessment.gates.length} (narrowest ${Math.min(
                ...assessment.gates.map((g) => g.width_inches),
              )}\")`
            : "None",
        },
        {
          label: "Obstacles",
          value: assessment.obstacles?.length ? `${assessment.obstacles.length} tagged` : "None",
        },
      ]
    : [];

  return (
    <StepShell
      step="review"
      title="Looks good?"
      description="Confirm the basics — we'll match you to mowers next."
      onContinue={handleComplete}
      continueLabel="See my recommendations"
      backHref={`/assessment/${id}/obstacles`}
    >
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white">
        <dl className="divide-y divide-stone-200">
          {fields.map((f) => (
            <div key={f.label} className="grid grid-cols-3 gap-3 p-4 text-sm">
              <dt className="font-medium text-stone-500">{f.label}</dt>
              <dd className="col-span-2 text-stone-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </StepShell>
  );
}
