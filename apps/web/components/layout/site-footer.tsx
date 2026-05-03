import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-stone-200 bg-stone-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span aria-hidden className="text-2xl">🌿</span>
            <span>ZippyLawnz</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-stone-600">
            Helping U.S. homeowners pick, install, and live with robotic lawn mowers.
          </p>
          <p className="mt-3 text-xs text-stone-500">
            A sub-brand of{" "}
            <a href="https://zippylawnz.com" className="underline hover:text-stone-900">
              ZippyLawnz
            </a>
            .
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Product</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li><Link href="/assessment" className="hover:text-stone-900">Start assessment</Link></li>
            <li><Link href="/grass" className="hover:text-stone-900">Grass care guide</Link></li>
            <li><Link href="/#mowers" className="hover:text-stone-900">Browse mowers</Link></li>
            <li><Link href="/#how" className="hover:text-stone-900">How it works</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li><Link href="/#faq" className="hover:text-stone-900">FAQ</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-stone-900">Privacy</Link></li>
            <li><Link href="/legal/terms" className="hover:text-stone-900">Terms</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li>
              <a href="mailto:hello@zippylawnz.com" className="hover:text-stone-900">
hello@zippylawnz.com
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-200 px-4 py-6 text-center text-xs text-stone-500 sm:px-6">
        © {new Date().getFullYear()} ZippyLawnz. All rights reserved.
      </div>
    </footer>
  );
}
