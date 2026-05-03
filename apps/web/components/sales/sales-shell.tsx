"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV: { href: string; label: string }[] = [
  { href: "/sales/leads", label: "Leads" },
];

interface Props {
  children: React.ReactNode;
}

export function SalesShell({ children }: Props) {
  const pathname = usePathname();
  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className="text-xl">🌿</span>
            <span>ZippyLawnz</span>
            <span className="hidden rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600 sm:inline">
              Sales
            </span>
          </Link>
          <nav className="flex flex-1 items-center gap-4 text-sm font-medium">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href as never}
                  className={cn(
                    "rounded-md px-2 py-1",
                    active ? "bg-stone-100 text-stone-900" : "text-stone-600 hover:text-stone-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
