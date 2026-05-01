"use client";

import { useEffect } from "react";

import { bootstrapAnalytics } from "@/lib/analytics";

/**
 * Mounted once at the root of the app. Boots PostHog if the user has
 * already accepted analytics cookies, and registers a listener for the
 * consent event so it boots on first acceptance without a refresh.
 */
export function AnalyticsProvider() {
  useEffect(() => {
    bootstrapAnalytics();
  }, []);
  return null;
}
