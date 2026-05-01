/**
 * Sentry server init — for server components, route handlers, edge runtime.
 *
 * The DSN can be the same as the client one or a separate server-only DSN.
 * The API service has its own Sentry init in apps/api/app/main.py with its
 * own DSN.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? "production",
    release: process.env.RELEASE,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    spotlight: process.env.NODE_ENV === "development",
  });
}
