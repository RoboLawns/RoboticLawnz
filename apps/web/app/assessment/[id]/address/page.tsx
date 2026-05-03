"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GooglePlacesAutocomplete } from "@/components/google-places-autocomplete";
import type { Place } from "@/components/google-places-autocomplete";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { patchAssessment } from "@/lib/assessment-client";
import { useApiAuth } from "@/lib/use-api-auth";

export default function AddressStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  const handlePlaceSelected = (selected: Place) => {
    setPlace(selected);
    setError(null);
  };

  const handleContinue = async () => {
    setError(null);
    if (!address.trim()) {
      setError("Please enter your home address to continue.");
      return;
    }
    try {
      await patchAssessment(
        id,
        {
          address: address.trim(),
          lat: place?.lat ?? (lat ? Number(lat) : undefined),
          lng: place?.lng ?? (lng ? Number(lng) : undefined),
        },
        getToken,
      );
      track("address_completed", { assessment_id: id });
      router.push(`/assessment/${id}/position`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save your address. Try again.");
    }
  };

  return (
    <StepShell
      step="address"
      title="Where's your yard?"
      description="We'll pull up a satellite view of your property so you can confirm we have the right place."
      onContinue={handleContinue}
      continueDisabled={!address.trim()}
      backHref="/"
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="address">Home address</Label>
          <GooglePlacesAutocomplete
            value={address}
            onChange={setAddress}
            onPlaceSelected={handlePlaceSelected}
            onError={setError}
            placeholder="1600 Pennsylvania Ave NW, Washington, DC"
            className="mt-2"
          />
          <p className="mt-2 text-xs text-stone-500">
            U.S. addresses only. We never share or sell your address.
          </p>
        </div>

        <details className="group rounded-xl border border-stone-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-stone-700">
            I already know my coordinates (optional)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                inputMode="decimal"
                placeholder="38.8977"
                value={place?.lat != null ? String(place.lat) : lat}
                onChange={(e) => setLat(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                inputMode="decimal"
                placeholder="-77.0365"
                value={place?.lng != null ? String(place.lng) : lng}
                onChange={(e) => setLng(e.target.value)}
                className="mt-2"
              />
            </div>
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
