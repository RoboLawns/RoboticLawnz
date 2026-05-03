"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

interface Props {
  lat: number;
  lng: number;
  token: string;
  onConfirm?: (view: { centerLat: number; centerLng: number; zoom: number; bearing: number }) => void;
  confirmLabel?: string;
}

export function PositionMap({ lat, lng, token, onConfirm, confirmLabel = "This is my house" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);

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
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.once("load", () => setReady(true));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, token]);

  const handleConfirm = () => {
    const map = mapRef.current;
    if (!map || !onConfirm) return;
    const center = map.getCenter();
    onConfirm({
      centerLat: center.lat,
      centerLng: center.lng,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
    });
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--radius-card)] bg-[#101114]" style={{ aspectRatio: "16/10" }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Pin at center */}
      <div className="pointer-events-none absolute left-1/2 bottom-1/2 z-10 -translate-x-1/2 translate-y-1/2">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-[3px] border-white bg-black/30 shadow-lg" />
          <div className="-mt-1 h-6 w-[3px] bg-white shadow-md" />
        </div>
      </div>

      {/* Top instruction */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
        <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
          {ready ? "Pan and zoom to center your house" : "Loading satellite view…"}
        </span>
      </div>

      {/* Confirm button */}
      {ready && (
        <div className="absolute inset-x-4 bottom-4 z-10">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-xl bg-leaf-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-leaf-700 active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      )}
    </div>
  );
}
