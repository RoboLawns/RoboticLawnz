/**
 * Sentry client init.
 *
 * Errors are not "tracking" in the GDPR sense — we capture them regardless of
 * cookie consent so production incidents are debuggable. We deliberately keep
 * the data surface narrow:
 *   - send_default_pii: false
 *   - no session replay
 *   - traces sample rate is low (0.05) to keep the free tier viable
 *   - the DSN must be set explicitly via NEXT_PUBLIC_SENTRY_DSN
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "production",
    release: process.env.NEXT_PUBLIC_RELEASE,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Filter out aborted-fetch noise from page navigations / cancelled requests.
    ignoreErrors: [
      "AbortError",
      "Failed to fetch",
      "Load failed",
      "NetworkError",
      // Mapbox-gl raises this on hot reloads in dev.
      "AbortError: BodyStreamBuffer was aborted",
    ],
    beforeSend(event) {
      // Strip query strings from URLs — they sometimes carry session data.
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url);
          u.search = "";
          event.request.url = u.toString();
        } catch {
          /* leave as-is */
        }
      }
      return event;
    },
  });
}
