"use client";

/**
 * Step 2 — yard map.
 *
 * Two paths to capture the lawn polygon:
 *   1. Auto-Detect (SAM 2) — user taps on grass, we call the lawn-segment API
 *      which runs SAM 2 via Replicate and returns a polygon. Displayed as an
 *      editable overlay. Falls back to manual drawing when Replicate is not
 *      configured or the model fails.
 *   2. Manual Draw — user draws a polygon by hand with MapboxDraw.
 *
 * Fallback (no Mapbox token, or no lat/lng):
 *   A plain sq-ft input lets the homeowner type their area so the flow is
 *   never blocked.
 */

import type { LawnSegmentResponse, PolygonGeoJSON } from "@zippylawnz/shared-types";
import area from "@turf/area";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import type { AutoDetectClickParams } from "@/components/LawnMap";
import { StepShell } from "@/components/assessment/step-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";
import { getAssessment, lawnSegment, patchAssessment } from "@/lib/assessment-client";
import { env } from "@/lib/env";
import { useApiAuth } from "@/lib/use-api-auth";

/**
 * Minimal GeoJSON types used at the interface with @turf/area and the LawnMap
 * component.  The `geojson` npm package is a transitive dependency and not
 * directly importable under pnpm strict mode, so we define what we need here.
 */
interface GeoJsonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}
interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJsonGeometry;
}

// Dynamic import keeps mapbox-gl (and its Web Workers) out of the SSR bundle.
const LawnMap = dynamic(
  () => import("@/components/LawnMap").then((m) => m.LawnMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[var(--radius-card)] bg-[#101114]">
        <span className="text-sm text-white/50">Loading satellite view…</span>
      </div>
    ),
  },
);

/** Conversion: 1 m² = 10.7639 ft² */
const SQM_TO_SQFT = 10.7639;

/** Convert API PolygonGeoJSON to a local GeoJSON-like feature for MapboxDraw. */
function polygonToFeature(p: PolygonGeoJSON): GeoJsonFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: p.coordinates,
    },
  };
}

/**
 * Build a Mapbox Static Images API URL that matches the current map view.
 * Replicate downloads this image as input to SAM 2.
 */
function buildStaticImageUrl(params: AutoDetectClickParams): string {
  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { lng, lat, zoom, bearing, containerWidth, containerHeight } = params;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/` +
    `${lng},${lat},${zoom},${bearing},0/${containerWidth}x${containerHeight}` +
    `?access_token=${token}`
  );
}

export default function MapStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [areaSqft, setAreaSqft] = useState<string>("");
  const [address, setAddress] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<GeoJsonFeature | null>(null);
  const [polygons, setPolygons] = useState<GeoJsonFeature[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Segmentation state
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [segmentPolygon, setSegmentPolygon] = useState<GeoJsonFeature | null>(null);
  const [segmentFallback, setSegmentFallback] = useState(false);

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
        if (a.lawn_polygon) {
          const feat = polygonToFeature(a.lawn_polygon);
          setPolygon(feat);
          setSegmentPolygon(feat);
        }
      })
      .catch(() => {
        /* Assessment may not exist yet — empty initial state is fine. */
      });
  }, [id, getToken]);

  // ── Polygon callback from LawnMap (manual draw or segmented) ──────────
  const handlePolygonChange = useCallback(
    (features: GeoJsonFeature[]) => {
      setPolygons(features);
      const main = features[0] ?? null;
      setPolygon(main);

      if (main && main.geometry.coordinates[0] && main.geometry.coordinates[0].length >= 3) {
        try {
          const totalSqm = features.reduce((sum, f) => {
            try { return sum + area(f as unknown as Parameters<typeof area>[0]); } catch { return sum; }
          }, 0);
          setAreaSqft(String(Math.round(totalSqm * SQM_TO_SQFT)));
        } catch {
          // Invalid polygon geometry — leave area as-is.
        }
      }
      setError(null);
    },
    [],
  );

  // ── Auto-detect tap handler ───────────────────────────────────────────
  const handleAutoDetectClick = useCallback(
    async (clickParams: AutoDetectClickParams) => {
      setError(null);
      setSegmentFallback(false);
      setIsSegmenting(true);

      try {
        const mapImageUrl = buildStaticImageUrl(clickParams);
        const result: LawnSegmentResponse = await lawnSegment(
          id,
          {
            map_image_url: mapImageUrl,
            click_points: [[clickParams.x, clickParams.y]],
            map_view: {
              center_lat: clickParams.lat,
              center_lng: clickParams.lng,
              zoom: clickParams.zoom,
              bearing: clickParams.bearing,
              width_px: clickParams.containerWidth,
              height_px: clickParams.containerHeight,
            },
          },
          getToken,
        );

        track("lawn_segment_attempted", {
          assessment_id: id,
          area_source: result.fallback_to_manual ? "manual" : "auto-detect",
        });

        if (result.fallback_to_manual) {
          setSegmentFallback(true);
          setError(
            "Auto-detection is not available right now. Please draw your lawn boundary manually.",
          );
          setIsSegmenting(false);
          return;
        }

        const feat = polygonToFeature(result.polygon);
        setSegmentPolygon(feat);
        setPolygon(feat);
        setAreaSqft(String(Math.round(result.area_sqft)));
        setIsSegmenting(false);
      } catch (e) {
        setSegmentFallback(true);
        setIsSegmenting(false);
        const message =
          e instanceof Error ? e.message : "Segmentation failed. Please draw manually.";
        setError(message);
        track("lawn_segment_error", { assessment_id: id });
      }
    },
    [id, getToken],
  );

  // ── Map visibility logic ───────────────────────────────────────────────
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
          ...(polygon && {
            lawn_polygon: {
              type: "Polygon" as const,
              coordinates: polygon.geometry.coordinates.map(
                (ring: number[][]): [number, number][] =>
                  ring.map((pos: number[]): [number, number] => {
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
        area_source: segmentPolygon && !segmentFallback ? "auto-detect" : polygon ? "polygon" : "manual",
      });
      router.push(`/assessment/${id}/slope`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    }
  };

  const continueDisabled = !areaSqft.trim() || Number(areaSqft) <= 0;

  return (
    <StepShell
      step="map"
      title="Outline your lawn"
      description={
        address
          ? `We're looking at ${address}. Tap Auto-Detect or draw your mowable area.`
          : "Tap Auto-Detect or draw your mowable grass area."
      }
      onContinue={handleContinue}
      continueDisabled={continueDisabled}
      backHref={`/assessment/${id}/position`}
    >
      <div className="space-y-6">
        {showMap && (
          <div className="aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-card)] border border-stone-200">
            <LawnMap
              lat={coords.lat}
              lng={coords.lng}
              token={env.NEXT_PUBLIC_MAPBOX_TOKEN!}
              onPolygonChange={handlePolygonChange}
              onAutoDetectClick={handleAutoDetectClick}
              isSegmenting={isSegmenting}
              segmentPolygon={segmentPolygon}
              multiZone
            />
          </div>
        )}

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

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </StepShell>
  );
}
