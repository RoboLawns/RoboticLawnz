"use client";

/**
 * LawnMap — interactive Mapbox satellite canvas with polygon-draw.
 *
 * Renders a satellite-streets basemap centered on the property, activates
 * Mapbox Draw in draw_polygon mode immediately, and calls onPolygonChange
 * whenever the user finishes (or edits) a polygon. Only one polygon is kept
 * at a time — drawing a second replaces the first.
 *
 * CSS for mapbox-gl and mapbox-gl-draw is imported at the module level so
 * Next.js/webpack bundles it correctly for client components.
 */

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Feature, Geometry, Polygon } from "geojson";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/default
import { useEffect, useRef, useState } from "react";

export interface LawnMapProps {
  /** Latitude of property center. */
  lat: number;
  /** Longitude of property center. */
  lng: number;
  /** Mapbox public access token. */
  token: string;
  /** Called with the drawn GeoJSON Feature<Polygon> on create or edit. */
  onPolygonChange: (feature: Feature<Polygon>) => void;
}

export function LawnMap({ lat, lng, token, onPolygonChange }: LawnMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  // MapboxDraw uses `export =`, so the instance type is `MapboxDraw`.
  const drawRef = useRef<MapboxDraw | null>(null);

  // Keep callback in a ref so the effect closure never goes stale.
  const onPolygonChangeRef = useRef(onPolygonChange);
  useEffect(() => {
    onPolygonChangeRef.current = onPolygonChange;
  }, [onPolygonChange]);

  // Overlay dismisses as soon as the user places their first vertex (first click).
  const [showInstruction, setShowInstruction] = useState(true);

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
      defaultMode: "draw_polygon",
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(draw);

    // Dismiss instruction overlay on first map click or touch.
    map.once("click", () => setShowInstruction(false));

    /** Keep at most one polygon; fire onPolygonChange with the latest. */
    const publishLatest = () => {
      const collection = draw.getAll();

      // Drop any polygons drawn before the current one.
      if (collection.features.length > 1) {
        const toDelete = collection.features
          .slice(0, -1)
          .map((f: Feature<Geometry>) => f.id)
          .filter((id): id is string => typeof id === "string");
        draw.delete(toDelete);
      }

      // noUncheckedIndexedAccess gives us Feature<Geometry> | undefined here.
      const latest = draw.getAll().features[0];
      if (latest?.geometry.type === "Polygon") {
        onPolygonChangeRef.current(latest as Feature<Polygon>);
      }
    };

    // "draw.create" / "draw.update" are custom MapboxDraw events not in the
    // typed event map — they fall through to the catch-all
    // `on(type: string, listener: (ev: EventData) => void)` overload,
    // which accepts () => void (fewer params is always valid in TS).
    map.on("draw.create", publishLatest);
    map.on("draw.update", publishLatest);

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [lat, lng, token]);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[var(--radius-card)]"
      style={{ background: "#101114" }}
    >
      {/* Mapbox GL canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Instruction overlay — dismisses on first click */}
      {showInstruction && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-4 flex justify-center"
        >
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            ✏️ Draw your lawn boundary
          </span>
        </div>
      )}
    </div>
  );
}
