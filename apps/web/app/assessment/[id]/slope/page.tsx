"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { appendSlopeSample, patchAssessment } from "@/lib/assessment-client";
import { useApiAuth } from "@/lib/use-api-auth";

interface SlopeWindow extends Window {
  DeviceOrientationEvent?: typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
}

interface RawSample {
  angle_deg: number;
  recorded_at: string;
}

/**
 * Step 3 — slope measurement.
 *
 * Uses DeviceOrientationEvent. iOS 13+ requires an explicit permission prompt
 * triggered from a user gesture; we surface a "Start" button that asks for
 * that permission first, then begins listening. Each "Record" tap captures
 * the current beta (front-back tilt) plus a timestamp.
 */
export default function SlopeStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [angleDeg, setAngleDeg] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [samples, setSamples] = useState<RawSample[]>([]);
  const [manualMax, setManualMax] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Detect support at mount and start listening if no permission gate.
  useEffect(() => {
    const w = window as SlopeWindow;
    if (typeof w.DeviceOrientationEvent === "undefined") {
      setSupported(false);
      return;
    }
    // Without iOS-style request, just attach.
    if (!w.DeviceOrientationEvent.requestPermission) {
      setPermission("granted");
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    const handler = (e: DeviceOrientationEvent) => {
      // beta = front-to-back tilt in degrees (-180..180).
      if (typeof e.beta === "number") setAngleDeg(Math.abs(e.beta));
    };
    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [permission]);

  // Geolocation — best-effort; we tag the slope sample with location if we have it.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  const requestPermission = async () => {
    setError(null);
    const w = window as SlopeWindow;
    const req = w.DeviceOrientationEvent?.requestPermission;
    if (!req) {
      setPermission("granted");
      return;
    }
    try {
      const result = await req();
      setPermission(result);
      if (result !== "granted") setError("Permission denied. You can enter a slope manually below.");
    } catch {
      setPermission("denied");
      setError("Couldn't access motion sensors. Use the manual entry below.");
    }
  };

  const recordSample = async () => {
    if (angleDeg == null) {
      setError("Hold your phone flat against the slope for a few seconds first.");
      return;
    }
    setError(null);
    const sample = {
      angle_deg: angleDeg,
      recorded_at: new Date().toISOString(),
    };
    setSamples((s) => [...s, sample]);
    try {
      await appendSlopeSample(
        id,
        {
          lat: position?.lat ?? 0,
          lng: position?.lng ?? 0,
          angle_deg: angleDeg,
          accuracy: null,
        },
        getToken,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save sample.");
    }
  };

  const angleToPct = (deg: number) => Math.round(Math.tan((deg * Math.PI) / 180) * 100);

  const summary = () => {
    if (!samples.length) return null;
    const pcts = samples.map((s) => angleToPct(s.angle_deg));
    return {
      max: Math.max(...pcts),
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      count: samples.length,
    };
  };

  const stats = summary();

  const handleContinue = async () => {
    setError(null);
    let max: number | undefined;
    let avg: number | undefined;

    if (samples.length) {
      max = stats!.max;
      avg = stats!.avg;
    } else if (manualMax.trim()) {
      const m = Number(manualMax);
      if (!Number.isFinite(m) || m < 0) {
        setError("Enter your steepest slope as a percentage.");
        return;
      }
      max = m;
      avg = m;
    } else {
      setError("Record at least one sample, or enter your steepest slope manually.");
      return;
    }
    try {
      await patchAssessment(id, { max_slope_pct: max, avg_slope_pct: avg }, getToken);
      track("slope_completed", {
        assessment_id: id,
        max_slope_pct: max,
        slope_source: samples.length ? "sensor" : "manual",
      });
      router.push(`/assessment/${id}/grass`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save slope. Try again.");
    }
  };

  const skipFlat = async () => {
    setError(null);
    try {
      await patchAssessment(id, { max_slope_pct: 0, avg_slope_pct: 0 }, getToken);
      track("slope_completed", { assessment_id: id, max_slope_pct: 0, slope_source: "manual" });
      router.push(`/assessment/${id}/grass`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
    }
  };

  return (
    <StepShell
      step="slope"
      title="Measure your steepest slope"
      description="Hold your phone flat against your steepest hill, then tap Record. Repeat 3–5 times across the steepest areas."
      onContinue={handleContinue}
      backHref={`/assessment/${id}/map`}
      footerExtra={
        <button onClick={skipFlat} className="text-leaf-700 underline-offset-4 hover:underline">
          My yard is flat
        </button>
      }
    >
      <div className="space-y-6">
        {!supported && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Your browser doesn&apos;t expose motion sensors. Use the manual entry below.
          </p>
        )}

        {supported && permission === "unknown" && (
          <Button onClick={requestPermission} size="lg" className="w-full">
            Start sensor — request motion permission
          </Button>
        )}

        {supported && permission === "granted" && (
          <div className="rounded-[var(--radius-card)] border border-stone-200 bg-white p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf-700">
              Live tilt
            </p>
            <p className="mt-2 text-5xl font-bold tabular-nums">
              {angleDeg != null ? angleDeg.toFixed(1) : "—"}
              <span className="text-2xl text-stone-500">°</span>
            </p>
            <p className="mt-1 text-sm text-stone-600">
              ≈ {angleDeg != null ? angleToPct(angleDeg) : "—"}% slope
            </p>
            <Button onClick={recordSample} size="lg" className="mt-4 w-full">
              Record sample
            </Button>
          </div>
        )}

        {samples.length > 0 && stats && (
          <div className="rounded-[var(--radius-card)] border border-leaf-200 bg-leaf-50 p-4">
            <p className="text-sm font-semibold text-leaf-900">
              {stats.count} sample{stats.count === 1 ? "" : "s"} · max {stats.max}% · avg {stats.avg}%
            </p>
          </div>
        )}

        <details className="rounded-xl border border-stone-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-stone-700">
            Enter slope manually instead
          </summary>
          <div className="mt-3">
            <Label htmlFor="manual-slope">Steepest slope (%)</Label>
            <Input
              id="manual-slope"
              inputMode="numeric"
              placeholder="e.g. 18"
              value={manualMax}
              onChange={(e) => setManualMax(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-2"
            />
            <p className="mt-2 text-xs text-stone-500">
              Tip: a 25% slope rises 25 ft over a 100 ft horizontal run.
            </p>
          </div>
        </details>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </StepShell>
  );
}
