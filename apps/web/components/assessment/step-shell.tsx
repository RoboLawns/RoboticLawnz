"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Stepper, type StepKey } from "./stepper";

interface Props {
  step: StepKey;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Hide top stepper for entry/start steps. */
  hideStepper?: boolean;
  /** Footer overrides — Continue / Back default to standard placements. */
  onContinue?: () => void | Promise<void>;
  continueLabel?: string;
  continueDisabled?: boolean;
  backHref?: string;
  /** Extra footer content (e.g. "skip" link). */
  footerExtra?: React.ReactNode;
}

export function StepShell({
  step,
  title,
  description,
  children,
  hideStepper = false,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  backHref,
  footerExtra,
}: Props) {
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="flex min-h-svh flex-col bg-leaf-50">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold">
            <span aria-hidden className="text-xl">🌿</span>
            <span className="hidden sm:inline">ZippyLawnz</span>
          </Link>
          <div className="flex-1">{!hideStepper && <Stepper current={step} />}</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="text-stone-700">{description}</p>}
        </div>
        <div className="mt-8">{children}</div>
      </main>

      <footer
        className={cn(
          "sticky bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          {backHref ? (
            <Button asChild variant="ghost" size="md">
              <Link href={backHref as never}>Back</Link>
            </Button>
          ) : (
            <span aria-hidden className="flex-1" />
          )}
          <div className="flex-1 text-center text-xs text-stone-500">{footerExtra}</div>
          {onContinue && (
            <Button
              size="lg"
              disabled={continueDisabled || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onContinue();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : continueLabel}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
