"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { RecommendationWithMower } from "@zippylawnz/shared-types";

import { FitBadge } from "./fit-badge";

interface Props {
  rec: RecommendationWithMower;
  defaultOpen?: boolean;
}

export function MowerCard({ rec, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const { mower } = rec;
  const top = rec.reasons.slice(0, 2);
  const rest = rec.reasons.slice(2);

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        <div className="flex-shrink-0 sm:w-32">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
            {/* Use a plain <img> rather than next/image so seed URLs that may
                404 don't blow up build-time validation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mower.image_url}
              alt={`${mower.brand} ${mower.model}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {mower.brand}
              </p>
              <h3 className="text-lg font-semibold leading-tight">{mower.model}</h3>
            </div>
            <FitBadge status={rec.fit_status} score={rec.fit_score} />
          </div>

          <p className="mt-2 text-2xl font-bold tabular-nums">
            ${mower.price_usd.toLocaleString()}
          </p>

          <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
            {top.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span aria-hidden className={cn(
                  "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                  r.severity === "green" && "bg-emerald-500",
                  r.severity === "yellow" && "bg-amber-500",
                  r.severity === "red" && "bg-rose-500",
                )} />
                <span>{r.message}</span>
              </li>
            ))}
          </ul>

          {rest.length > 0 && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-leaf-700 hover:underline"
            >
              {open ? "Hide details" : `Show ${rest.length} more reason${rest.length === 1 ? "" : "s"}`}
              <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
            </button>
          )}

          {open && rest.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
              {rest.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span aria-hidden className={cn(
                    "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                    r.severity === "green" && "bg-emerald-500",
                    r.severity === "yellow" && "bg-amber-500",
                    r.severity === "red" && "bg-rose-500",
                  )} />
                  <span>{r.message}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-stone-600 sm:grid-cols-5">
            <Spec label="Max area" value={`${mower.max_area_sqft.toLocaleString()} sf`} />
            <Spec label="Max slope" value={`${mower.max_slope_pct}%`} />
            <Spec label="Min gate" value={`${mower.min_passage_inches}"`} />
            <Spec label="Drive" value={mower.drive_type.toUpperCase()} />
            <Spec label="Nav" value={mower.navigation_type.toUpperCase()} />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={mower.product_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
            >
              Manufacturer page →
            </a>
            <a
              href={mower.manufacturer_specs_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-stone-700 underline-offset-4 hover:underline"
            >
              Full specs →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-0.5 font-semibold text-stone-900">{value}</p>
    </div>
  );
}
