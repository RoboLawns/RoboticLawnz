"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepKey = "address" | "map" | "slope" | "grass" | "obstacles" | "review";

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "address", label: "Address" },
  { key: "map", label: "Yard map" },
  { key: "slope", label: "Slope" },
  { key: "grass", label: "Grass" },
  { key: "obstacles", label: "Gates" },
  { key: "review", label: "Review" },
];

interface Props {
  current: StepKey;
}

export function Stepper({ current }: Props) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol
      aria-label="Assessment progress"
      className="flex w-full items-center justify-between gap-1 px-1 text-[11px] font-medium uppercase tracking-wider text-stone-500"
    >
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li
            key={step.key}
            className="flex flex-1 flex-col items-center gap-1"
            aria-current={active ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 -translate-x-1",
                    i <= idx ? "bg-leaf-500" : "bg-stone-200",
                  )}
                />
              )}
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-leaf-500 bg-leaf-500 text-white",
                  active && "border-leaf-500 bg-white text-leaf-700 ring-4 ring-leaf-100",
                  !done && !active && "border-stone-300 bg-white text-stone-500",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 translate-x-1",
                    i < idx ? "bg-leaf-500" : "bg-stone-200",
                  )}
                />
              )}
            </div>
            <span className={cn("hidden sm:block", active && "text-stone-900")}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
