"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { useApiAuth } from "@/lib/use-api-auth";

/**
 * Entry step. POSTs an empty draft to /assessments and redirects to the
 * address step. Anonymous users get a signed session cookie automatically.
 */
export default function AssessmentEntry() {
  const router = useRouter();
  const getToken = useApiAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    fetch("/api/v1/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timer);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`API returned ${res.status}: ${body.slice(0, 200)}`);
        }
        return res.json();
      })
      .then((data: { id: string }) => {
        track("assessment_started", { assessment_id: data.id });
        router.replace(`/assessment/${data.id}/address`);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          setError(e instanceof Error ? e.message : "Failed to start assessment.");
        }
      });
  }, [router, getToken]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-leaf-50 px-4">
      <div className="rounded-2xl bg-white p-8 shadow-md max-w-sm w-full text-center">
        {error ? (
          <>
            <h1 className="text-lg font-semibold text-stone-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-stone-600 break-words">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-leaf-600 px-6 py-2 text-sm font-medium text-white hover:bg-leaf-700"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-leaf-500" />
            <p className="mt-4 text-sm font-medium text-stone-700">
              Starting your assessment…
            </p>
            <p className="mt-1 text-xs text-stone-400">One moment</p>
          </>
        )}
      </div>
    </main>
  );
}
