import * as React from "react";

import { cn } from "@/lib/utils";

/** Plain HTML <select> styled to match the Input — keeps mobile native picker. */
export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-12 w-full appearance-none rounded-xl border border-stone-300 bg-white px-4 pr-10 text-base shadow-sm focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/30 disabled:cursor-not-allowed disabled:opacity-50",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23737373%22><path d=%22M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z%22/></svg>')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
