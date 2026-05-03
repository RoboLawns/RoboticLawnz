import { z } from "zod";

/**
 * Frontend env, validated at module load. Anything starting with `NEXT_PUBLIC_`
 * is shipped to the browser; everything else is server-only.
 */
const ClientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_BASE_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ).default("http://localhost:8000/api/v1"),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  NEXT_PUBLIC_GOOGLE_PLACES_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  NEXT_PUBLIC_POSTHOG_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  NEXT_PUBLIC_POSTHOG_HOST: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ).default("https://us.i.posthog.com"),
});

export const env = ClientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  NEXT_PUBLIC_GOOGLE_PLACES_KEY: process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});
