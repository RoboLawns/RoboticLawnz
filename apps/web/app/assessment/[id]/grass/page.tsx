"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useRef, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { patchAssessment, uploadGrassPhoto } from "@/lib/assessment-client";
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

export default function GrassStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [species, setSpecies] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Photo classifier state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [guesses, setGuesses] = useState<{ species: string; confidence: number }[] | null>(null);
  const [classifierUnavailable, setClassifierUnavailable] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    setPhotoUrl(URL.createObjectURL(file));
    setError(null);
    setIsClassifying(true);
    setGuesses(null);

    track("grass_photo_uploaded", { assessment_id: id });

    try {
      const result = await uploadGrassPhoto(id, file, getToken);
      setGuesses(result.guesses);
      if (result.guesses.length > 0 && result.guesses[0]) {
        setSpecies(result.guesses[0].species);
        track("grass_photo_classified", {
          assessment_id: id,
          grass_type: result.guesses[0].species,
        });
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Photo analysis failed. Try manual selection.";
      setError(message);
      if (err instanceof ApiError && err.status === 503) {
        setClassifierUnavailable(true);
      }
    } finally {
      setIsClassifying(false);
    }
  };

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
          grass_type_guesses: [
            {
              species,
              confidence: guesses?.[0]?.confidence ?? (species === "I'm not sure" ? 0 : 0.9),
            },
          ],
        },
        getToken,
      );
      track("grass_completed", { assessment_id: id, grass_type: species });
      router.push(`/assessment/${id}/obstacles`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save grass type. Try again.");
    }
  };

  return (
    <StepShell
      step="grass"
      title="What kind of grass do you have?"
      description="Snap a photo or pick manually — different species need different cutting heights."
      onContinue={handleContinue}
      continueDisabled={!species || isClassifying}
      backHref={`/assessment/${id}/slope`}
    >
      <div className="space-y-6">
        {/* ── Photo upload ─────────────────────────────────────────────── */}
        <div>
          <Label>Take a photo of your grass</Label>
          <p className="mb-3 text-xs text-stone-500">
            Get close (4–6 inches from the blades) for best results. We&apos;ll
            identify the species using AI.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
            aria-hidden
          />

          {!photoUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isClassifying || classifierUnavailable}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center transition hover:border-leaf-400 hover:bg-leaf-50 active:scale-[0.99]"
            >
              <svg
                className="h-8 w-8 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
              <span className="text-sm font-semibold text-stone-700">
                {classifierUnavailable
                  ? "Photo analysis unavailable — use dropdown below"
                  : "Tap to take a photo"}
              </span>
            </button>
          )}

          {/* ── Photo preview ──────────────────────────────────────────── */}
          {photoUrl && (
            <div className="relative overflow-hidden rounded-xl border border-stone-200">
              <Image
                src={photoUrl}
                alt="Your grass photo"
                width={400}
                height={300}
                className="h-48 w-full object-cover"
              />
              {isClassifying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-black/70 px-5 py-4">
                    <svg
                      className="h-6 w-6 animate-spin text-leaf-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-white">
                      Identifying grass…
                    </span>
                  </div>
                </div>
              )}
              {!isClassifying && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setGuesses(null);
                    setSpecies("");
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white/80 transition hover:bg-black/70"
                  aria-label="Remove photo"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* ── Classification results ─────────────────────────────────── */}
          {guesses && guesses.length > 0 && !isClassifying && (() => {
            const top = guesses[0];
            if (!top) return null;
            return (
            <div className="mt-3 rounded-xl border border-leaf-200 bg-leaf-50 p-4">
              <p className="text-sm font-semibold text-leaf-800">
                {top.confidence >= 0.7
                  ? "We're pretty confident this is:"
                  : "Our best guess:"}
              </p>
              <p className="mt-1 text-lg font-bold text-leaf-900">{top.species}</p>
              <p className="mt-0.5 text-xs text-leaf-600">
                Confidence: {Math.round(top.confidence * 100)}%
              </p>
              {top.confidence < 0.5 && (
                <p className="mt-2 text-xs text-amber-700">
                  Not confident? You can override the selection below, or try another photo.
                </p>
              )}
            </div>
            );
          })()}
        </div>

        {/* ── Manual dropdown ───────────────────────────────────────────── */}
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
            {guesses
              ? "The species detected from your photo is selected above. Change it if needed."
              : "Don't know your grass type? Take a photo above or pick the closest match."}
          </p>
        </div>

        {/* ── Learn link ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-medium text-stone-700">Want to learn more?</p>
          <p className="mt-1 text-xs text-stone-500">
            Visit our{" "}
            <Link
              href="/grass"
              className="font-medium text-leaf-600 underline underline-offset-2 hover:text-leaf-800"
            >
              Grass Care Guide
            </Link>{" "}
            for species details, mowing tips, watering schedules, and seasonal advice.
          </p>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </StepShell>
  );
}
