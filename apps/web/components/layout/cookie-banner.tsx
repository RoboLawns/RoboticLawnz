"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/consent";

/**
 * GDPR-style consent banner.
 *
 * Shown until the user clicks Accept all or Essential only. Writes to
 * localStorage so the choice persists. Listens for nothing — re-mount the
 * page to re-show.
 */
export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getConsent() === "unset") setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      aria-describedby="rl-cookie-text"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p id="rl-cookie-text" className="text-sm text-stone-700">
          We use essential cookies to keep you signed in. With your permission we&apos;ll also use
          analytics cookies to understand how the assessment flow is performing. See our{" "}
          <Link href="/legal/privacy" className="font-medium text-leaf-700 underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConsent("essential");
              setShow(false);
            }}
          >
            Essential only
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setConsent("all");
              setShow(false);
            }}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
