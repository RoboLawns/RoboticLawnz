import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="text-2xl">🌿</span>
          <span className="text-base sm:text-lg">Robotic Lawnz</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 sm:flex">
          <Link href="/#how" className="hover:text-stone-900">How it works</Link>
          <Link href="/mowers" className="hover:text-stone-900">Mowers</Link>
          <Link href="/#faq" className="hover:text-stone-900">FAQ</Link>
          <SignedIn>
            <Link href="/me" className="hover:text-stone-900">My yards</Link>
          </SignedIn>
        </nav>

        <div className="flex items-center gap-3">
          {/* Show avatar when signed in, sign-in button when not */}
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="redirect">
              <Button variant="outline" size="sm">Sign in</Button>
            </SignInButton>
          </SignedOut>

          <Button asChild size="sm">
            <Link href="/assessment">Start assessment</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
