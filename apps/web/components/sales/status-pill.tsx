import { cn } from "@/lib/utils";
import type { LeadStatus } from "@roboticlawnz/shared-types";

const STYLES: Record<LeadStatus, string> = {
  new: "bg-leaf-50 text-leaf-800 ring-leaf-200",
  contacted: "bg-sky-50 text-sky-800 ring-sky-200",
  qualified: "bg-violet-50 text-violet-800 ring-violet-200",
  sold: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  lost: "bg-stone-100 text-stone-700 ring-stone-300",
};

const LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  sold: "Sold",
  lost: "Lost",
};

export function StatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "sold", "lost"];
export { LABELS as LEAD_STATUS_LABELS };
