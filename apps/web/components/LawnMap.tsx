"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoJsonFeature {
  type: "Feature";
  id?: string;
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon" | "LineString";
    coordinates: number[][][] | number[][];
  };
}

export interface AutoDetectClickParams {
  lng: number;
  lat: number;
  x: number;
  y: number;
  zoom: number;
  bearing: number;
  containerWidth: number;
  containerHeight: number;
}

export type DrawingMode = "zone" | "no-go" | "channel" | null;

export interface LawnMapProps {
  lat: number;
  lng: number;
  token: string;
  drawingMode: DrawingMode;
  selectedId: string | null;
  objects: { id: string; type: string; feature: GeoJsonFeature }[];
  onFeatureCreated: (feature: GeoJsonFeature, mode: DrawingMode) => void;
  onFeatureUpdated: (features: GeoJsonFeature[]) => void;
  onFeatureDeleted: (ids: string[]) => void;
  onSelect: (id: string | null) => void;
  onAutoDetectClick?: (params: AutoDetectClickParams) => void;
  isSegmenting?: boolean;
  segmentPolygon?: GeoJsonFeature | null;
}

export function LawnMap({
  lat,
  lng,
  token,
  drawingMode,
  selectedId,
  objects,
  onFeatureCreated,
  onFeatureUpdated,
  onFeatureDeleted,
  onSelect,
  onAutoDetectClick,
  isSegmenting = false,
  segmentPolygon,
}: LawnMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const autoDetectRef = useRef(false);
  const [autoDetectActive, setAutoDetectActive] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [zoneCount, setZoneCount] = useState(0);

  const onFeatureCreatedRef = useRef(onFeatureCreated);
  useEffect(() => { onFeatureCreatedRef.current = onFeatureCreated; }, [onFeatureCreated]);
  const onFeatureUpdatedRef = useRef(onFeatureUpdated);
  useEffect(() => { onFeatureUpdatedRef.current = onFeatureUpdated; }, [onFeatureUpdated]);
  const onFeatureDeletedRef = useRef(onFeatureDeleted);
  useEffect(() => { onFeatureDeletedRef.current = onFeatureDeleted; }, [onFeatureDeleted]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  const onAutoDetectClickRef = useRef(onAutoDetectClick);
  useEffect(() => { onAutoDetectClickRef.current = onAutoDetectClick; }, [onAutoDetectClick]);
  const drawingModeRef = useRef(drawingMode);
  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);

  useEffect(() => { autoDetectRef.current = autoDetectActive; }, [autoDetectActive]);

  // ── Apply drawing mode ───────────────────────────────────────────────
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    if (autoDetectActive) return;

    if (drawingMode === "channel") {
      draw.changeMode("draw_line_string");
    } else if (drawingMode === "zone" || drawingMode === "no-go") {
      draw.changeMode("draw_polygon");
    } else {
      draw.changeMode("simple_select");
    }
  }, [drawingMode, autoDetectActive]);

  // ── Sync objects from props (restore saved state) ─────────────────────
  useEffect(() => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map || !map.loaded()) return;

    // Only restore when objects change externally (not from draw events)
    const currentIds = new Set(draw.getAll().features.map((f) => f.id));
    const desiredIds = new Set(objects.map((o) => o.feature.id ?? o.id));
    const idsStr = [...currentIds].sort().join(",");
    const desiredStr = [...desiredIds].sort().join(",");
    if (idsStr === desiredStr) return;

    draw.deleteAll();
    objects.forEach((obj) => {
      const feat = { ...obj.feature, id: obj.feature.id ?? obj.id };
      draw.add(feat);
    });
    draw.changeMode("simple_select");
    setHasPolygon(objects.length > 0);
    setZoneCount(objects.length);
  }, [objects]);

  // ── Apply selection styling ──────────────────────────────────────────
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    // MapboxDraw selection is handled by the draw.selectionchange event
    // and simple_select mode. No custom styling via setFeatureProperty needed.
  }, [selectedId, objects]);

  // ── Initialization ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [lng, lat],
      zoom: 19,
      touchZoomRotate: true,
      touchPitch: false,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      defaultMode: "simple_select",
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(draw);
    draw.changeMode("simple_select");

    // ── Auto-detect tap handler ───────────────────────────────────────
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (!autoDetectRef.current) return;
      const cb = onAutoDetectClickRef.current;
      if (!cb) return;
      const container = map.getContainer();
      cb({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        x: e.point.x,
        y: e.point.y,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        containerWidth: container.clientWidth,
        containerHeight: container.clientHeight,
      });
    };
    map.on("click", handleMapClick);

    // ── Draw event handlers ──────────────────────────────────────────
    map.on("draw.create", (e: { features: Array<{ id?: string; geometry: { type: string }; properties: Record<string, unknown> }> }) => {
      const feature = e.features[0];
      if (!feature) return;
      const mode = drawingModeRef.current;
      const feat = feature as unknown as GeoJsonFeature;
      feat.id = String(feature.id ?? "");
      onFeatureCreatedRef.current(feat, mode);
    });

    map.on("draw.update", () => {
      const all = draw.getAll();
      const polys = all.features.filter((f) => f.geometry?.type) as unknown as GeoJsonFeature[];
      onFeatureUpdatedRef.current(polys);
      setHasPolygon(polys.length > 0);
      setZoneCount(polys.length);
    });

    map.on("draw.delete", (e: { features: Array<{ id?: string }> }) => {
      const ids = e.features.map((f) => String(f.id ?? "")).filter(Boolean);
      onFeatureDeletedRef.current(ids);
      setHasPolygon(false);
      setZoneCount(0);
    });

    // ── Selection handler ────────────────────────────────────────────
    map.on("draw.selectionchange", (e: { features: Array<{ id?: string }> }) => {
      const feat = e.features[0];
      if (feat?.id) {
        onSelectRef.current(String(feat.id));
      }
    });

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [lat, lng, token]);

  // ── Apply segmented polygon when it arrives ─────────────────────────
  useEffect(() => {
    if (!segmentPolygon || !drawRef.current) return;
    const draw = drawRef.current;
    draw.add(segmentPolygon);
    draw.changeMode("simple_select");
    setHasPolygon(true);
    setAutoDetectActive(false);
  }, [segmentPolygon]);

  // ── Controls ───────────────────────────────────────────────────────
  const enterAutoDetect = useCallback(() => {
    setAutoDetectActive(true);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#101114]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top instruction */}
      {!drawingMode && !autoDetectActive && !hasPolygon && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            Select a tool from the sidebar to start
          </span>
        </div>
      )}

      {drawingMode && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            {drawingMode === "zone" && "Draw a mowable zone"}
            {drawingMode === "no-go" && "Draw a no-go area"}
            {drawingMode === "channel" && "Draw a channel path"}
          </span>
        </div>
      )}

      {/* Auto-detect instruction */}
      {autoDetectActive && !isSegmenting && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <span className="rounded-full bg-leaf-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            Tap on your grass
          </span>
        </div>
      )}

      {/* Loading spinner */}
      {isSegmenting && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/70 px-6 py-5 shadow-lg backdrop-blur-sm">
            <svg className="h-8 w-8 animate-spin text-leaf-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-white">Detecting lawn…</span>
          </div>
        </div>
      )}

      {/* Bottom toolbar — only for auto-detect mode */}
      <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2">
        {autoDetectActive && !isSegmenting && (
          <button
            type="button"
            onClick={() => setAutoDetectActive(false)}
            className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-stone-800 shadow-lg backdrop-blur-sm hover:bg-white"
          >
            Cancel
          </button>
        )}
        {!autoDetectActive && !drawingMode && !isSegmenting && onAutoDetectClick && (
          <button
            type="button"
            onClick={enterAutoDetect}
            className="rounded-xl bg-leaf-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-leaf-700"
          >
            AI Auto-Detect
          </button>
        )}
      </div>
    </div>
  );
}
