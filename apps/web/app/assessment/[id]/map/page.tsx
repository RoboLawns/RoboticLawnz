"use client";

import area from "@turf/area";
import type { LawnSegmentResponse, PolygonGeoJSON } from "@zippylawnz/shared-types";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import type { DrawingMode, GeoJsonFeature } from "@/components/LawnMap";
import { StepShell } from "@/components/assessment/step-shell";
import type { MapObject, MapObjectType } from "@/components/map/map-sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";
import { getAssessment, lawnSegment, patchAssessment } from "@/lib/assessment-client";
import { env } from "@/lib/env";
import { useApiAuth } from "@/lib/use-api-auth";

const LawnMap = dynamic(() => import("@/components/LawnMap").then((m) => m.LawnMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#101114]">
      <span className="text-sm text-white/50">Loading map…</span>
    </div>
  ),
});

const MapSidebar = dynamic(
  () => import("@/components/map/map-sidebar").then((m) => m.MapSidebar),
  { ssr: false },
);

const SQM_TO_SQFT = 10.7639;

let objectCounter = 0;
function makeId() {
  return `obj-${Date.now()}-${++objectCounter}`;
}

export default function MapStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [areaSqft, setAreaSqft] = useState<string>("");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sidebar state
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);

  // Segmentation
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [segmentPolygon, setSegmentPolygon] = useState<GeoJsonFeature | null>(null);

  const hasToken = Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN);

  // Total mowable area (zones only)
  const totalArea = useMemo(() => {
    return objects
      .filter((o) => o.type === "zone" && o.areaSqft != null)
      .reduce((sum, o) => sum + (o.areaSqft ?? 0), 0);
  }, [objects]);

  // Feature-to-object mapping
  const objFeatures = useMemo(() => {
    return objects.map((o) => {
      const feat = features.find(
        (f) => f.id === o.id || f.properties?.mapObjectId === o.id,
      );
      return { ...o, feature: feat ?? null };
    });
  }, [objects, features]);

  useEffect(() => {
    getAssessment(id, getToken)
      .then((a) => {
        setAddress(a.address);
        if (a.lat != null && a.lng != null) setCoords({ lat: a.lat, lng: a.lng });
        if (a.lawn_area_sqft != null) setAreaSqft(String(Math.round(a.lawn_area_sqft)));
      })
      .catch(() => {});
  }, [id, getToken]);

  // ── Sidebar handlers ──────────────────────────────────────────────
  const handleAdd = useCallback((type: MapObjectType) => {
    setDrawingMode(type);
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((objId: string | null) => {
    setSelectedId(objId);
    setDrawingMode(null);
  }, []);

  const handleDelete = useCallback((objId: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== objId));
    setFeatures((prev) => prev.filter((f) => f.id !== objId));
    if (selectedId === objId) {
      setSelectedId(null);
      setDrawingMode(null);
    }
  }, [selectedId]);

  const handleRename = useCallback((objId: string, label: string) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, label } : o)));
  }, []);

  // ── Map handlers ──────────────────────────────────────────────────
  const handleFeatureCreated = useCallback(
    (feature: GeoJsonFeature, mode: DrawingMode) => {
      if (!mode) return;
      const objId = makeId();
      const feat = { ...feature, id: objId, properties: { ...feature.properties, mapObjectId: objId } };

      let sqft = 0;
      try {
        if (feature.geometry.type === "Polygon") {
          const sqm = area(feat as unknown as Parameters<typeof area>[0]);
          sqft = Math.round(sqm * SQM_TO_SQFT);
        }
      } catch { /* ignore */ }

      const label =
        mode === "zone" ? `Zone ${objects.filter((o) => o.type === "zone").length + 1}`
        : mode === "no-go" ? `No-go ${objects.filter((o) => o.type === "no-go").length + 1}`
        : `Channel ${objects.filter((o) => o.type === "channel").length + 1}`;

      const newObj: MapObject = { id: objId, type: mode, label, areaSqft: sqft > 0 ? sqft : undefined };
      setObjects((prev) => [...prev, newObj]);
      setFeatures((prev) => [...prev, feat]);
      setDrawingMode(null);
      setSelectedId(objId);
    },
    [objects],
  );

  const handleFeatureUpdated = useCallback((updated: GeoJsonFeature[]) => {
    setFeatures(updated);
    setObjects((prev) =>
      prev.map((obj) => {
        const feat = updated.find((f) => f.id === obj.id || f.properties?.mapObjectId === obj.id);
        if (!feat) return obj;
        let sqft = 0;
        try {
          if (feat.geometry.type === "Polygon") {
            sqft = Math.round(area(feat as unknown as Parameters<typeof area>[0]) * SQM_TO_SQFT);
          }
        } catch { /* ignore */ }
        return { ...obj, areaSqft: sqft > 0 ? sqft : obj.areaSqft };
      }),
    );

    // Update total area display
    const zoneArea = updated.reduce((sum, feat) => {
      try {
        if (feat.geometry.type === "Polygon") {
          return sum + Math.round(area(feat as unknown as Parameters<typeof area>[0]) * SQM_TO_SQFT);
        }
      } catch { /* ignore */ }
      return sum;
    }, 0);
    if (zoneArea > 0) setAreaSqft(String(zoneArea));
  }, []);

  const handleFeatureDeleted = useCallback((ids: string[]) => {
    setObjects((prev) => prev.filter((o) => !ids.includes(o.id)));
    setFeatures((prev) => prev.filter((f) => !ids.includes(f.id ?? "")));
    if (ids.includes(selectedId ?? "")) setSelectedId(null);
  }, [selectedId]);

  // ── AI auto-detect ────────────────────────────────────────────────
  const handleAutoDetectClick = useCallback(
    async (params: { lng: number; lat: number; x: number; y: number; zoom: number; bearing: number; containerWidth: number; containerHeight: number }) => {
      setError(null);
      setIsSegmenting(true);

      try {
        const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const mapImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${params.lng},${params.lat},${params.zoom},${params.bearing},0/${params.containerWidth}x${params.containerHeight}?access_token=${token}`;

        const result: LawnSegmentResponse = await lawnSegment(id, {
          map_image_url: mapImageUrl,
          click_points: [[params.x, params.y]],
          map_view: {
            center_lat: params.lat,
            center_lng: params.lng,
            zoom: params.zoom,
            bearing: params.bearing,
            width_px: params.containerWidth,
            height_px: params.containerHeight,
          },
        }, getToken);

        track("lawn_segment_attempted", { assessment_id: id });

        if (result.fallback_to_manual) {
          setError("Auto-detection unavailable right now. Draw manually from the sidebar.");
          setIsSegmenting(false);
          return;
        }

        const feat: GeoJsonFeature = {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: result.polygon.coordinates },
        };
        setSegmentPolygon(feat);
        setIsSegmenting(false);

        // Add auto-detected zone to objects
        const objId = makeId();
        const newObj: MapObject = {
          id: objId,
          type: "zone",
          label: `Zone ${objects.filter((o) => o.type === "zone").length + 1}`,
          areaSqft: Math.round(result.area_sqft),
        };
        setObjects((prev) => [...prev, newObj]);
        setAreaSqft(String(Math.round(result.area_sqft)));

        // Wait for map to add the feature, then register it
        setTimeout(() => {
          setFeatures((prev) => [...prev, { ...feat, id: objId, properties: { mapObjectId: objId } }]);
        }, 500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Segmentation failed.");
        setIsSegmenting(false);
        track("lawn_segment_error", { assessment_id: id });
      }
    },
    [id, getToken, objects],
  );

  // ── Continue ──────────────────────────────────────────────────────
  const handleContinue = async () => {
    setError(null);
    const sqft = Number(areaSqft);
    if (!Number.isFinite(sqft) || sqft <= 0) {
      setError("Please draw at least one mowable zone to continue.");
      return;
    }

    try {
      const mainZone = features.find((f) => f.geometry.type === "Polygon" && objects.find((o) => o.id === f.id)?.type === "zone");

      await patchAssessment(id, {
        lawn_area_sqft: sqft,
        ...(mainZone && {
          lawn_polygon: {
            type: "Polygon" as const,
            coordinates: (mainZone.geometry.coordinates as number[][][]).map(
              (ring: number[][]): [number, number][] =>
                ring.map((pos: number[]): [number, number] => [pos[0] ?? 0, pos[1] ?? 0]),
            ),
          },
        }),
      }, getToken);

      track("map_completed", { assessment_id: id, lawn_area_sqft: sqft, area_source: "polygon" });
      router.push(`/assessment/${id}/slope`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
    }
  };

  const continueDisabled = !areaSqft.trim() || Number(areaSqft) <= 0;

  return (
    <StepShell
      step="map"
      title="Map your lawn"
      description={address ? `Mapping ${address}. Use the sidebar to add zones, no-go areas, and channels.` : "Use the sidebar to add zones and obstacles."}
      onContinue={handleContinue}
      continueDisabled={continueDisabled}
      backHref={`/assessment/${id}/position`}
      footerExtra={
        <span className="text-xs">
          {totalArea > 0 ? `${totalArea.toLocaleString()} sq ft total` : ""}
        </span>
      }
    >
      <div className="-mx-4 flex h-[calc(100vh-14rem)] sm:-mx-6">
        {!hasToken ? (
          <FallbackView areaSqft={areaSqft} setAreaSqft={setAreaSqft} />
        ) : !coords ? (
          <div className="flex w-full items-center justify-center bg-stone-50">
            <p className="text-sm text-stone-500">Waiting for coordinates...</p>
          </div>
        ) : (
          <>
            <MapSidebar
              objects={objects}
              selectedId={selectedId}
              onSelect={handleSelect}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onRename={handleRename}
              totalArea={totalArea > 0 ? totalArea : undefined}
            />
            <div className="flex-1">
              <LawnMap
                lat={coords.lat}
                lng={coords.lng}
                token={env.NEXT_PUBLIC_MAPBOX_TOKEN!}
                drawingMode={drawingMode}
                selectedId={selectedId}
                objects={objFeatures.filter((o) => o.feature).map((o) => ({ id: o.id, type: o.type, feature: o.feature! }))}
                onFeatureCreated={handleFeatureCreated}
                onFeatureUpdated={handleFeatureUpdated}
                onFeatureDeleted={handleFeatureDeleted}
                onSelect={handleSelect}
                onAutoDetectClick={handleAutoDetectClick}
                isSegmenting={isSegmenting}
                segmentPolygon={segmentPolygon}
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </StepShell>
  );
}

function FallbackView({ areaSqft, setAreaSqft }: { areaSqft: string; setAreaSqft: (v: string) => void }) {
  return (
    <div className="flex w-full items-center justify-center bg-stone-50 p-8">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-stone-700">Map not available</p>
        <p className="mt-1 text-xs text-stone-500">
          Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map. Enter your lawn area below to continue.
        </p>
        <div className="mt-4">
          <Label htmlFor="area">Lawn area (sq ft)</Label>
          <Input
            id="area"
            inputMode="numeric"
            placeholder="8500"
            value={areaSqft}
            onChange={(e) => setAreaSqft(e.target.value.replace(/[^0-9.]/g, ""))}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}
