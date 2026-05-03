import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FitStatus } from "@zippylawnz/shared-types";

interface Props {
  status: FitStatus;
  score?: number;
  size?: "sm" | "md";
}

const STYLES: Record<FitStatus, { bg: string; text: string; ring: string; label: string; icon: React.ReactNode }> = {
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    ring: "ring-emerald-200",
    label: "Will work",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  yellow: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
    label: "Borderline",
    icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
  },
  red: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    ring: "ring-rose-200",
    label: "Not recommended",
    icon: <XCircle className="h-4 w-4" aria-hidden />,
  },
};

export function FitBadge({ status, score, size = "md" }: Props) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        s.bg,
        s.text,
        s.ring,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
      )}
    >
      {s.icon}
      {s.label}
      {score != null && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
