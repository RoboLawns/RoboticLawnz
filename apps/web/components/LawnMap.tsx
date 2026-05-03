"use client";

/**
 * LawnMap — interactive Mapbox satellite canvas with polygon-draw AND
 * tap-to-segment support (SAM 2 via the lawn-segment API endpoint).
 *
 * Two modes:
 *   "Auto-Detect" — tap anywhere on grass to trigger CV lawn segmentation.
 *   "Draw"        — draw a polygon manually with MapboxDraw (existing flow).
 *
 * CSS for mapbox-gl and mapbox-gl-draw is imported at the module level so
 * Next.js/webpack bundles it correctly for client components.
 */

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/default
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal GeoJSON Polygon feature used at the component boundary.
 * The `geojson` npm package is a transitive dependency and not directly
 * importable under pnpm strict mode, so we define what we need here.
 */
export interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface AutoDetectClickParams {
  /** Longitude of the tap point. */
  lng: number;
  /** Latitude of the tap point. */
  lat: number;
  /** Pixel X within the map container. */
  x: number;
  /** Pixel Y within the map container. */
  y: number;
  /** Current map zoom level. */
  zoom: number;
  /** Current map bearing (degrees). */
  bearing: number;
  /** Container width in CSS pixels. */
  containerWidth: number;
  /** Container height in CSS pixels. */
  containerHeight: number;
}

export interface LawnMapProps {
  /** Latitude of property center. */
  lat: number;
  /** Longitude of property center. */
  lng: number;
  /** Mapbox public access token. */
  token: string;
  /** Called with the drawn polygon on create or edit. */
  onPolygonChange: (feature: GeoJsonFeature) => void;
  /**
   * Called when the user taps grass in auto-detect mode. The parent should
   * call the lawn-segment API and update `segmentPolygon` / `isSegmenting`.
   */
  onAutoDetectClick?: (params: AutoDetectClickParams) => void;
  /** Whether a segmentation request is in flight. */
  isSegmenting?: boolean;
  /**
   * A polygon returned by the segmentation API. When set, it is
   * displayed on the map as an editable overlay.
   */
  segmentPolygon?: GeoJsonFeature | null;
}

export function LawnMap({
  lat,
  lng,
  token,
  onPolygonChange,
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

  const onPolygonChangeRef = useRef(onPolygonChange);
  useEffect(() => {
    onPolygonChangeRef.current = onPolygonChange;
  }, [onPolygonChange]);

  const onAutoDetectClickRef = useRef(onAutoDetectClick);
  useEffect(() => {
    onAutoDetectClickRef.current = onAutoDetectClick;
  }, [onAutoDetectClick]);

  useEffect(() => {
    autoDetectRef.current = autoDetectActive;
  }, [autoDetectActive]);

  // ── Initialization ──────────────────────────────────────────────────────
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

    // ── Polygon change publisher ──────────────────────────────────────
    const publishLatest = () => {
      const collection = draw.getAll();

      if (collection.features.length > 1) {
        const toDelete = collection.features
          .slice(0, -1)
          .map((f) => f.id)
          .filter((id) => typeof id === "string");
        draw.delete(toDelete as string[]);
      }

      const latest = draw.getAll().features[0];
      if (latest?.geometry.type === "Polygon") {
        onPolygonChangeRef.current(latest as GeoJsonFeature);
        setHasPolygon(true);
      } else {
        setHasPolygon(false);
      }
    };

    map.on("draw.create", publishLatest);
    map.on("draw.update", publishLatest);
    map.on("draw.delete", publishLatest);

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [lat, lng, token]);

  // ── Apply segmented polygon when it arrives ─────────────────────────────
  useEffect(() => {
    if (!segmentPolygon || !drawRef.current) return;

    const draw = drawRef.current;
    draw.deleteAll();
    draw.add(segmentPolygon);
    draw.changeMode("simple_select");

    setHasPolygon(true);
    setAutoDetectActive(false);

    onPolygonChangeRef.current(segmentPolygon);
  }, [segmentPolygon]);

  // ── Mode controls ───────────────────────────────────────────────────────

  const enterDrawMode = useCallback(() => {
    setAutoDetectActive(false);
    drawRef.current?.changeMode("draw_polygon");
  }, []);

  const enterAutoDetectMode = useCallback(() => {
    drawRef.current?.deleteAll();
    drawRef.current?.changeMode("simple_select");
    setHasPolygon(false);
    setAutoDetectActive(true);
  }, []);

  const clearPolygon = useCallback(() => {
    drawRef.current?.deleteAll();
    drawRef.current?.changeMode("simple_select");
    setHasPolygon(false);
    setAutoDetectActive(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[var(--radius-card)] bg-[#101114]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Instruction overlay */}
      {!hasPolygon && !autoDetectActive && !isSegmenting && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-4 flex justify-center"
        >
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            Outline your lawn below
          </span>
        </div>
      )}

      {/* Auto-detect instruction */}
      {autoDetectActive && !isSegmenting && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-4 flex justify-center"
        >
          <span className="rounded-full bg-leaf-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            Tap on your grass
          </span>
        </div>
      )}

      {/* Polygon-complete indicator */}
      {hasPolygon && !autoDetectActive && !isSegmenting && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-4 flex justify-center"
        >
          <span className="rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            Lawn mapped
          </span>
        </div>
      )}

      {/* Loading spinner */}
      {isSegmenting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/70 px-6 py-5 shadow-lg backdrop-blur-sm">
            <svg
              className="h-8 w-8 animate-spin text-leaf-400"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-medium text-white">Detecting lawn…</span>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
        {!hasPolygon && !autoDetectActive && !isSegmenting && (
          <>
            {onAutoDetectClick && (
              <button
                type="button"
                onClick={enterAutoDetectMode}
                className="flex-1 rounded-xl bg-leaf-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-leaf-700 active:scale-[0.98]"
              >
                Auto-Detect
              </button>
            )}
            <button
              type="button"
              onClick={enterDrawMode}
              className="flex-1 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-lg backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
            >
              Draw Boundary
            </button>
          </>
        )}

        {autoDetectActive && !isSegmenting && (
          <button
            type="button"
            onClick={() => setAutoDetectActive(false)}
            className="flex-1 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-lg backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
          >
            Cancel
          </button>
        )}

        {hasPolygon && !isSegmenting && (
          <>
            <button
              type="button"
              onClick={enterDrawMode}
              className="flex-1 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-lg backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={clearPolygon}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 shadow-lg backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
