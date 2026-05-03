import type { Metadata } from "next";
import Link from "next/link";

import { RoiCalculator } from "@/components/roi/roi-calculator";

export const metadata: Metadata = {
  title: "ROI Calculator · ZippyLawnz",
  description:
    "Calculate how much you can save with a robotic lawn mower. Compare costs, see payback period, and find out how many hours you'll reclaim.",
};

export default function RoiPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <RoiCalculator />

      <div className="mt-12 space-y-8">
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-stone-900">How we calculate this</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>
              <strong className="text-stone-800">Monthly spend:</strong> Your current lawn care costs — mowing service, gas for your mower, trimmer line, maintenance, and your time at a conservative $15/hour.
            </li>
            <li>
              <strong className="text-stone-800">Payback period:</strong> Mower price divided by monthly savings. Most homeowners break even in 12–24 months.
            </li>
            <li>
              <strong className="text-stone-800">5-year savings:</strong> What you save over 5 years minus the mower cost and battery replacements (~$200 every 3 years). Assumes electricity cost of ~$5/month.
            </li>
            <li>
              <strong className="text-stone-800">Time reclaimed:</strong> Based on a 35-week mowing season. Includes mowing, trimming, edging, and cleanup time.
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-leaf-800">
            Want a personalized recommendation?
          </h3>
          <p className="mt-1 text-sm text-leaf-600">
            Our free yard assessment matches you with the right robotic mower for your
            specific lawn — size, slope, grass type, and all.
          </p>
          <Link
            href="/assessment"
            className="mt-4 inline-block rounded-xl bg-leaf-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-leaf-700"
          >
            Start your free assessment →
          </Link>
        </div>
      </div>
    </div>
  );
}
