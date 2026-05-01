"use client";

import posthog from "posthog-js";

import { env } from "./env";
import { CONSENT_EVENT, getConsent, type ConsentValue } from "./consent";

/**
 * PostHog analytics — gated on cookie-banner consent.
 *
 * Loaded only after the user accepts non-essential cookies, and only when
 * NEXT_PUBLIC_POSTHOG_KEY is configured. Calling `track` before then is a
 * no-op so call sites stay clean.
 */

let initialised = false;

function initIfReady(consent: ConsentValue) {
  if (initialised || consent !== "all") return;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false, // we instrument intentionally, not by DOM scrape
    disable_session_recording: true,
    loaded: (ph) => {
      ph.register({ app: "roboticlawnz-web" });
    },
  });
  initialised = true;
}

/** Boot listener — call once at app start. Idempotent. */
export function bootstrapAnalytics(): void {
  if (typeof window === "undefined") return;
  initIfReady(getConsent());
  window.addEventListener(CONSENT_EVENT, (e) => {
    initIfReady((e as CustomEvent<ConsentValue>).detail);
  });
}

/** Stop tracking (e.g. when user revokes consent — future feature). */
export function shutdownAnalytics(): void {
  if (initialised) {
    posthog.reset();
    initialised = false;
  }
}

// ----------------------------------------------------------------------------
// Funnel event vocabulary
// ----------------------------------------------------------------------------
//
// Names follow snake_case verb_noun. Keep them stable — dashboards reference
// these strings directly.

export type AnalyticsEvent =
  | "assessment_started"
  | "address_completed"
  | "map_completed"
  | "slope_completed"
  | "grass_completed"
  | "obstacles_completed"
  | "review_completed"
  | "recommendations_viewed"
  | "lead_captured"
  | "lead_dialog_opened";

export interface EventProps {
  assessment_id?: string;
  lawn_area_sqft?: number;
  max_slope_pct?: number;
  grass_type?: string;
  gate_count?: number;
  obstacle_count?: number;
  green_count?: number;
  yellow_count?: number;
  red_count?: number;
  slope_source?: "sensor" | "manual";
  area_source?: "polygon" | "manual";
}

export function track(event: AnalyticsEvent, props: EventProps = {}): void {
  if (!initialised) return;
  posthog.capture(event, props);
}

/** Identify the current user once Clerk reports a sub. */
export function identify(clerkSub: string, traits: Record<string, unknown> = {}): void {
  if (!initialised) return;
  posthog.identify(clerkSub, traits);
}
