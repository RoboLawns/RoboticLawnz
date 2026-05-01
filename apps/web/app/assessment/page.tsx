"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { track } from "@/lib/analytics";
import { ApiError, apiFetch } from "@/lib/api";
import { useApiAuth } from "@/lib/use-api-auth";

interface CreateResponse {
  id: string;
}

/**
 * Entry step. POSTs an empty draft to /assessments and redirects to the
 * address step. Anonymous users get a signed session cookie automatically;
 * authenticated users have their Clerk JWT attached so the new assessment
 * is owned by their account.
 */
export default function AssessmentEntry() {
  const router = useRouter();
  const getToken = useApiAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<CreateResponse>("/assessments", {
          method: "POST",
          body: {},
          getToken,
        });
        track("assessment_started", { assessment_id: res.id });
        if (!cancelled) router.replace(`/assessment/${res.id}/address`);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError ? e.message : "We couldn't start your assessment. Please retry.";
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, getToken]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-leaf-50 px-4">
      <div className="rounded-2xl bg-white p-8 shadow-md">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-stone-700">{error}</p>
            <button
              onClick={() => location.reload()}
              className="mt-4 rounded-full bg-leaf-600 px-5 py-2 text-white"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">
              Starting your assessment
            </p>
            <p className="mt-1 text-stone-700">One moment…</p>
            <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full w-1/2 animate-pulse bg-leaf-500" />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
