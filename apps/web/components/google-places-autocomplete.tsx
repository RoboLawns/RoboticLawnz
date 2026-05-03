"use client";

import { useEffect, useId, useRef, useState } from "react";

import { env } from "@/lib/env";
import { Input } from "@/components/ui/input";

export interface Place {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: Place) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const SCRIPT_ID = "google-maps-js-api";
const PLACES_LIBRARY = "places";

let scriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(key: string): Promise<void> {
  if (scriptPromise) return scriptPromise;

  if (typeof window === "undefined" || document.getElementById(SCRIPT_ID)) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=${PLACES_LIBRARY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  onError,
  disabled = false,
  placeholder = "Enter your home address",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [scriptState, setScriptState] = useState<"loading" | "ready" | "unavailable">(
    env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ? "loading" : "unavailable",
  );
  const inputId = useId();

  useEffect(() => {
    const key = env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    if (!key || !inputRef.current) {
      setScriptState("unavailable");
      return;
    }

    let cancelled = false;

    loadGoogleMapsScript(key)
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "us" },
          fields: ["formatted_address", "geometry.location"],
          types: ["address"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const addr = place.formatted_address;
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();

          if (!addr || lat == null || lng == null) {
            onError?.("Please select an address from the dropdown.");
            return;
          }

          onChange(addr);
          onPlaceSelected({ address: addr, lat, lng });
        });
        autocompleteRef.current = autocomplete;
        setScriptState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setScriptState("unavailable");
          onError?.("Address autocomplete is temporarily unavailable. You can type your address manually.");
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Input
      ref={inputRef}
      id={inputId}
      autoComplete="street-address"
      placeholder={placeholder}
      value={scriptState === "ready" ? undefined : value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
      aria-label="Home address"
      data-autocomplete={scriptState}
    />
  );
}
