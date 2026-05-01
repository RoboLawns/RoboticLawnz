"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { patchAssessment } from "@/lib/assessment-client";
import { useApiAuth } from "@/lib/use-api-auth";

const SPECIES = [
  "Bermuda",
  "Kentucky Bluegrass",
  "Tall Fescue",
  "Fine Fescue",
  "Perennial Ryegrass",
  "St. Augustine",
  "Zoysia",
  "Centipede",
  "Bahia",
  "Buffalo",
  "I'm not sure",
] as const;

/**
 * Step 4 — grass type.
 *
 * MVP shortcut from Section 6.2.6: ship with a manual dropdown. The photo +
 * classifier integration lands when the Replicate model and R2 bucket are
 * provisioned.
 */
export default function GrassStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [species, setSpecies] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    if (!species) {
      setError("Pick the closest match — or 'I'm not sure'.");
      return;
    }
    try {
      await patchAssessment(
        id,
        {
          grass_type_guesses: [{ species, confidence: species === "I'm not sure" ? 0 : 0.9 }],
        },
        getToken,
      );
      track("grass_completed", { assessment_id: id, grass_type: species });
      router.push(`/assessment/${id}/obstacles`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save grass type. Try again.");
    }
  };

  return (
    <StepShell
      step="grass"
      title="What kind of grass do you have?"
      description="Different species need different cutting heights — this helps us pick the right mower."
      onContinue={handleContinue}
      continueDisabled={!species}
      backHref={`/assessment/${id}/slope`}
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="species">Grass species</Label>
          <Select
            id="species"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="mt-2"
          >
            <option value="" disabled>
              Choose your grass type…
            </option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-stone-500">
            Photo identification coming soon. For now, the closest match is plenty accurate for a recommendation.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </StepShell>
  );
}
