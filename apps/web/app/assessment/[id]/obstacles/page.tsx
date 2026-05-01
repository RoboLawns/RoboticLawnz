"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { getAssessment, patchAssessment } from "@/lib/assessment-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Gate, Obstacle, ObstacleType } from "@roboticlawnz/shared-types";

const OBSTACLE_TYPES: { value: ObstacleType; label: string }[] = [
  { value: "tree", label: "Tree" },
  { value: "flower_bed", label: "Flower bed" },
  { value: "pool", label: "Pool" },
  { value: "sprinkler_head", label: "Sprinkler head" },
  { value: "slope_too_steep", label: "Spot too steep" },
  { value: "other", label: "Other" },
];

export default function ObstaclesStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [gates, setGates] = useState<Gate[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  const [gateWidth, setGateWidth] = useState("");
  const [gateLabel, setGateLabel] = useState("");
  const [obstacleType, setObstacleType] = useState<ObstacleType>("tree");
  const [obstacleNote, setObstacleNote] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAssessment(id, getToken)
      .then((a) => {
        setGates(a.gates ?? []);
        setObstacles(a.obstacles ?? []);
        if (a.lat != null && a.lng != null) setCenter({ lat: a.lat, lng: a.lng });
      })
      .catch(() => {});
  }, [id, getToken]);

  const addGate = () => {
    const w = Number(gateWidth);
    if (!Number.isFinite(w) || w <= 0) {
      setError("Enter the gate width in inches.");
      return;
    }
    setGates((g) => [
      ...g,
      {
        width_inches: w,
        lat: center?.lat ?? 0,
        lng: center?.lng ?? 0,
        label: gateLabel.trim() || undefined,
      },
    ]);
    setGateWidth("");
    setGateLabel("");
    setError(null);
  };

  const addObstacle = () => {
    setObstacles((o) => [
      ...o,
      {
        type: obstacleType,
        lat: center?.lat ?? 0,
        lng: center?.lng ?? 0,
        notes: obstacleNote.trim() || undefined,
      },
    ]);
    setObstacleNote("");
  };

  const removeGate = (i: number) => setGates((g) => g.filter((_, idx) => idx !== i));
  const removeObstacle = (i: number) => setObstacles((o) => o.filter((_, idx) => idx !== i));

  const handleContinue = async () => {
    setError(null);
    try {
      await patchAssessment(id, { gates, obstacles }, getToken);
      track("obstacles_completed", {
        assessment_id: id,
        gate_count: gates.length,
        obstacle_count: obstacles.length,
      });
      router.push(`/assessment/${id}/review`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
    }
  };

  return (
    <StepShell
      step="obstacles"
      title="Tag gates &amp; obstacles"
      description="The narrowest gate determines whether a mower can move between zones. Skip if you have neither."
      onContinue={handleContinue}
      backHref={`/assessment/${id}/grass`}
    >
      <div className="space-y-8">
        <section className="rounded-[var(--radius-card)] border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Gates</h2>
          <p className="mt-1 text-sm text-stone-600">
            Tape-measure the narrowest one. We&apos;ll filter out any mower that won&apos;t fit through.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <div>
              <Label htmlFor="gate-width">Width (in)</Label>
              <Input
                id="gate-width"
                inputMode="decimal"
                placeholder="32"
                value={gateWidth}
                onChange={(e) => setGateWidth(e.target.value.replace(/[^0-9.]/g, ""))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="gate-label">Label (optional)</Label>
              <Input
                id="gate-label"
                placeholder="Side yard gate"
                value={gateLabel}
                onChange={(e) => setGateLabel(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addGate} variant="outline" size="md">
                Add gate
              </Button>
            </div>
          </div>

          {gates.length > 0 && (
            <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200">
              {gates.map((g, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span>
                    <strong>{g.width_inches}&quot;</strong>
                    {g.label && <span className="text-stone-600"> · {g.label}</span>}
                  </span>
                  <button
                    onClick={() => removeGate(i)}
                    className="text-stone-500 hover:text-rose-600"
                    aria-label={`Remove gate ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[var(--radius-card)] border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Obstacles &amp; no-go zones</h2>
          <p className="mt-1 text-sm text-stone-600">
            Trees, beds, pools, sprinkler heads — anything the mower needs to navigate around.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_3fr_auto]">
            <div>
              <Label htmlFor="obstacle-type">Type</Label>
              <Select
                id="obstacle-type"
                value={obstacleType}
                onChange={(e) => setObstacleType(e.target.value as ObstacleType)}
                className="mt-2"
              >
                {OBSTACLE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="obstacle-note">Notes (optional)</Label>
              <Input
                id="obstacle-note"
                placeholder="Big oak by the driveway"
                value={obstacleNote}
                onChange={(e) => setObstacleNote(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addObstacle} variant="outline" size="md">
                Add
              </Button>
            </div>
          </div>

          {obstacles.length > 0 && (
            <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200">
              {obstacles.map((o, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span>
                    <strong>
                      {OBSTACLE_TYPES.find((t) => t.value === o.type)?.label ?? o.type}
                    </strong>
                    {o.notes && <span className="text-stone-600"> · {o.notes}</span>}
                  </span>
                  <button
                    onClick={() => removeObstacle(i)}
                    className="text-stone-500 hover:text-rose-600"
                    aria-label={`Remove obstacle ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </StepShell>
  );
}
