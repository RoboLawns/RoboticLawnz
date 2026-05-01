"use client";

/**
 * Step 2 — yard map.
 *
 * Happy path (NEXT_PUBLIC_MAPBOX_TOKEN is set + assessment has lat/lng):
 *   1. <LawnMap> loads dynamically (no SSR — mapbox-gl uses browser APIs).
 *   2. User draws a polygon over their lawn.
 *   3. @turf/area converts the polygon to sq-ft.
 *   4. PATCH /assessments/{id} saves lawn_polygon + lawn_area_sqft.
 *   5. Continue enables only after a valid polygon exists.
 *
 * Fallback (no token, or no lat/lng):
 *   A plain sq-ft input lets the homeowner type their area so the flow
 *   is never blocked.
 */

import area from "@turf/area";
import type { Feature, Polygon } from "geojson";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";
import { getAssessment, patchAssessment } from "@/lib/assessment-client";
import { env } from "@/lib/env";
import { useApiAuth } from "@/lib/use-api-auth";

// Dynamic import keeps mapbox-gl (and its Web Workers) out of the SSR bundle.
const LawnMap = dynamic(
  () => import("@/components/LawnMap").then((m) => m.LawnMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex aspect-[16/10] w-full items-center justify-center rounded-[var(--radius-card)]"
        style={{ background: "#101114" }}
      >
        <span className="text-sm text-white/50">Loading satellite view…</span>
      </div>
    ),
  },
);

/** Conversion: 1 m² = 10.7639 ft² */
const SQM_TO_SQFT = 10.7639;

export default function MapStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [areaSqft, setAreaSqft] = useState<string>("");
  const [address, setAddress] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<Feature<Polygon> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasToken = Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN);

  // ── Load existing assessment data ──────────────────────────────────────
  useEffect(() => {
    getAssessment(id, getToken)
      .then((a) => {
        setAddress(a.address);
        if (a.lat != null && a.lng != null) {
          setCoords({ lat: a.lat, lng: a.lng });
        }
        if (a.lawn_area_sqft != null) {
          setAreaSqft(String(Math.round(a.lawn_area_sqft)));
        }
      })
      .catch(() => {
        /* Assessment may not exist yet — empty initial state is fine. */
      });
  }, [id, getToken]);

  // ── Polygon callback from LawnMap ──────────────────────────────────────
  const handlePolygonChange = useCallback((feature: Feature<Polygon>) => {
    setPolygon(feature);
    const sqm = area(feature);
    setAreaSqft(String(Math.round(sqm * SQM_TO_SQFT)));
    setError(null);
  }, []);

  // ── Map visibility logic ───────────────────────────────────────────────
  // Show the interactive map only when we have both token AND coordinates.
  const showMap = hasToken && coords !== null;

  // ── Continue handler ───────────────────────────────────────────────────
  const handleContinue = async () => {
    setError(null);
    const sqft = Number(areaSqft);
    if (!Number.isFinite(sqft) || sqft <= 0) {
      setError("Please outline your lawn or enter an area in square feet to continue.");
      return;
    }

    try {
      await patchAssessment(
        id,
        {
          lawn_area_sqft: sqft,
          // Build a PolygonGeoJSON from the drawn feature.
          // We reconstruct coordinates explicitly so the type matches
          // PolygonGeoJSON's [number, number][][] (vs GeoJSON's number[][][]).
          ...(polygon && {
            lawn_polygon: {
              type: "Polygon" as const,
              coordinates: polygon.geometry.coordinates.map((ring) =>
                ring.map((pos): [number, number] => {
                  const lng = pos[0];
                  const lat = pos[1];
                  return [lng ?? 0, lat ?? 0];
                }),
              ),
            },
          }),
        },
        getToken,
      );
      track("map_completed", {
        assessment_id: id,
        lawn_area_sqft: sqft,
        area_source: polygon ? "polygon" : "manual",
      });
      router.push(`/assessment/${id}/slope`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    }
  };

  // Continue is enabled once the user has a valid area value.
  const continueDisabled = !areaSqft.trim() || Number(areaSqft) <= 0;

  return (
    <StepShell
      step="map"
      title="Outline your lawn"
      description={
        address
          ? `We're looking at ${address}. Draw a polygon over your mowable area.`
          : "Draw a polygon over your mowable grass area."
      }
      onContinue={handleContinue}
      continueDisabled={continueDisabled}
      backHref={`/assessment/${id}/address`}
    >
      <div className="space-y-6">
        {/* ── Interactive satellite map ─────────────────────────────────── */}
        {showMap && (
          <div className="aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-card)] border border-stone-200">
            <LawnMap
              lat={coords.lat}
              lng={coords.lng}
              token={env.NEXT_PUBLIC_MAPBOX_TOKEN!}
              onPolygonChange={handlePolygonChange}
            />
          </div>
        )}

        {/* ── Token present but no coordinates ────────────────────────── */}
        {hasToken && !showMap && (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-stone-200">
            <div className="flex aspect-[16/10] w-full items-center justify-center bg-stone-100 p-6 text-center">
              <div>
                <p className="text-sm font-medium text-stone-700">Satellite view unavailable</p>
                <p className="mt-1 text-xs text-stone-500">
                  We couldn&apos;t determine your property coordinates. Enter your lawn area below
                  to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── No token ─────────────────────────────────────────────────── */}
        {!hasToken && (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-stone-200">
            <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-leaf-200 via-leaf-400 to-emerald-700 p-6 text-center text-white/95">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest">Satellite preview</p>
                <p className="mt-2 max-w-md text-sm">
                  Set{" "}
                  <code className="rounded bg-black/20 px-1 font-mono text-xs">
                    NEXT_PUBLIC_MAPBOX_TOKEN
                  </code>{" "}
                  to enable the interactive satellite map. Enter your lawn area below to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Area field (auto-filled from polygon, or manual entry) ────── */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <Label htmlFor="area">
            {showMap ? "Lawn area (auto-calculated from polygon)" : "Lawn area (square feet)"}
          </Label>
          <Input
            id="area"
            inputMode="numeric"
            placeholder="e.g. 8500"
            value={areaSqft}
            onChange={(e) => setAreaSqft(e.target.value.replace(/[^0-9.]/g, ""))}
            className="mt-2"
          />
          <p className="mt-2 text-xs text-stone-500">
            {showMap
              ? "Calculated from your drawn polygon. Adjust if needed."
              : "One acre ≈ 43,560 sq ft. A typical suburban lot is 5,000–10,000 sq ft."}
          </p>
        </div>

        {/* ── Error display ─────────────────────────────────────────────── */}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </StepShell>
  );
}
