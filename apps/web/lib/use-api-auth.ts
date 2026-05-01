"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo } from "react";

/**
 * Convenience hook that returns a stable `getToken` callback bound to the
 * current Clerk session. Pass the returned function as the optional last
 * arg to any of the API helpers (`apiFetch`, `getAssessment`, etc.).
 *
 * When the user is signed out, `getToken()` resolves to `null` and the API
 * client falls back to the anonymous session cookie — so this hook is safe
 * to call from every page in the assessment flow without gating on auth.
 */
export function useApiAuth(): () => Promise<string | null> {
  const { getToken, isLoaded } = useAuth();
  // Memoise so referential equality is stable — useful when the value is
  // listed in a useEffect dependency array.
  return useMemo(
    () =>
      async () => {
        if (!isLoaded) return null;
        try {
          return await getToken();
        } catch {
          // Clerk hasn't fully initialised yet, or the user is signed out.
          return null;
        }
      },
    [getToken, isLoaded],
  );
}

/**
 * Same as `useApiAuth()` but returns a callback that can be used inside the
 * body of a single async event handler without depending on the result.
 * Equivalent in practice — exported for naming clarity at call sites.
 */
export function useGetApiToken() {
  const get = useApiAuth();
  return useCallback(get, [get]);
}
