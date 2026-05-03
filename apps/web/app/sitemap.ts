import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://zippylawnz.com";

/**
 * Static sitemap for the public surface. The mower-detail pages are not
 * enumerated here because the catalog is data; once we have ≥30 SEO-relevant
 * mowers, generate this dynamically from the API at request time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/mowers`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/assessment`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
