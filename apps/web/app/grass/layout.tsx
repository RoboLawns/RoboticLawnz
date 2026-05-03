import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Grass Care Guide · ZippyLawnz",
  description:
    "Learn about different grass species, care tips, mowing heights, watering schedules, and seasonal maintenance for your lawn.",
};

export default function GrassLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">{children}</div>
  );
}
