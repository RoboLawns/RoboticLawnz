import type { Config } from "tailwindcss";

/**
 * Tailwind 4 configuration. Most theme values live in `globals.css` via the
 * `@theme` directive — this file is kept minimal for content scanning + plugin
 * registration only.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
};

export default config;
