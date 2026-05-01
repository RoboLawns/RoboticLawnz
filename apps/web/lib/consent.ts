"use client";

/**
 * Cookie / analytics consent state, persisted to localStorage.
 *
 * Three states:
 *   - "unset"     — user hasn't decided yet; the banner is shown.
 *   - "essential" — only strictly-necessary cookies (auth, session) are used.
 *   - "all"       — analytics + product telemetry are also enabled.
 *
 * The banner writes to localStorage and dispatches a custom event so any
 * subscribers (PostHog, etc.) can react without polling.
 */

export type ConsentValue = "unset" | "essential" | "all";

const KEY = "rl-consent-v1";
const EVENT = "rl:consent";

export function getConsent(): ConsentValue {
  if (typeof window === "undefined") return "unset";
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "essential" || v === "all") return v;
  } catch {
    /* private mode — fall through */
  }
  return "unset";
}

export function setConsent(v: Exclude<ConsentValue, "unset">): void {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* ignore write errors — best-effort */
  }
  window.dispatchEvent(new CustomEvent<ConsentValue>(EVENT, { detail: v }));
}

export function onConsentChange(cb: (v: ConsentValue) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentValue>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export const CONSENT_EVENT = EVENT;
