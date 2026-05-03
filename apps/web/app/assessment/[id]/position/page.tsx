"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { StepShell } from "@/components/assessment/step-shell";
import { track } from "@/lib/analytics";
import { getAssessment, patchAssessment } from "@/lib/assessment-client";
import { env } from "@/lib/env";
import { useApiAuth } from "@/lib/use-api-auth";

const PositionMap = dynamic(
  () => import("@/components/PositionMap").then((m) => m.PositionMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

function MapSkeleton() {
  return (
    <div
      className="flex aspect-[16/10] w-full items-center justify-center rounded-[var(--radius-card)] bg-[#101114]"
    >
      <span className="text-sm text-white/50">Loading satellite view…</span>
    </div>
  );
}

export default function PositionStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const getToken = useApiAuth();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAssessment(id, getToken)
      .then((a) => {
        setAddress(a.address);
        if (a.lat != null && a.lng != null) {
          setCoords({ lat: a.lat, lng: a.lng });
        }
      })
      .catch(() => {});
  }, [id, getToken]);

  const handleConfirm = async (view: { centerLat: number; centerLng: number; zoom: number; bearing: number }) => {
    setConfirmed(true);
    setError(null);

    try {
      await patchAssessment(id, {
        lat: view.centerLat,
        lng: view.centerLng,
      }, getToken);
      track("address_completed", { assessment_id: id });
      router.push(`/assessment/${id}/map`);
    } catch (e) {
      setConfirmed(false);
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    }
  };

  const hasToken = Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN);

  return (
    <StepShell
      step="position"
      title="Confirm your house"
      description={
        address
          ? `We found ${address}. Center the crosshair on your house and confirm.`
          : "Center the crosshair on your house and confirm."
      }
      continueLabel={confirmed ? "Saving…" : "Continue"}
      continueDisabled={true}
      backHref={`/assessment/${id}/address`}
    >
      <div className="space-y-4">
        {hasToken && coords ? (
          <>
            <PositionMap
              lat={coords.lat}
              lng={coords.lng}
              token={env.NEXT_PUBLIC_MAPBOX_TOKEN!}
              onConfirm={handleConfirm}
              confirmLabel={confirmed ? "Confirming…" : "This is my house"}
            />
            <p className="text-center text-xs text-stone-500">
              Drag and pinch to position your house under the crosshair. We&apos;ll lock this view for the next step.
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
            <p className="text-sm text-stone-600">
              {!hasToken
                ? "Map token not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN."
                : "Waiting for address coordinates…"}
            </p>
            {!hasToken && (
              <button
                type="button"
                onClick={() => router.push(`/assessment/${id}/map`)}
                className="mt-4 rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
              >
                Skip to drawing
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </StepShell>
  );
}
