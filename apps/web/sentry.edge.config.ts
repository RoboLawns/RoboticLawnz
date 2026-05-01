/** Sentry init for the Next.js edge runtime (middleware, edge route handlers). */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? "production",
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
  });
}
