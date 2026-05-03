import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

const STEPS: { title: string; body: string; icon: string }[] = [
  {
    title: "Map your yard",
    body: "Drop a pin on your address. Our AI traces your lawn from satellite imagery — you fine-tune in seconds.",
    icon: "🛰️",
  },
  {
    title: "Measure your slope",
    body: "Walk your steepest hill with your phone held flat. We capture the angle automatically — no inclinometer required.",
    icon: "📐",
  },
  {
    title: "Match your mower",
    body: "Get a ranked list of robotic mowers that actually fit your yard, gates, slope, and grass type — with the why behind every pick.",
    icon: "🤖",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "How long does the assessment take?",
    a: "About 8 minutes. Address → satellite confirmation → tap to outline grass → walk your hill → photo of your grass → tag gates and obstacles → results.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. ZippyLawnz works in your phone's browser. We use built-in motion sensors for slope and your camera for grass identification — both with explicit permission prompts.",
  },
  {
    q: "Is my data sold or shared?",
    a: "Never. Aggregate insights only. Your address and yard outline stay between you, ZippyLawnz, and any installer you explicitly opt into.",
  },
  {
    q: "What if my yard is too steep or too big?",
    a: "We'll tell you up front, and recommend the closest workable options or alternative approaches. No surprises after you buy.",
  },
  {
    q: "Who is ZippyLawnz?",
    a: "Our parent brand and fulfillment partner — they handle purchase, install, and warranty service for everything ZippyLawnz recommends.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-leaf-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">
                Powered by ZippyLawnz
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                Find the robotic mower that&nbsp;actually&nbsp;fits&nbsp;your&nbsp;yard.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-stone-700">
                Map your lawn, measure your slope, and get a ranked match in under 10 minutes — with a
                clear explanation of every recommendation.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/assessment">Start your assessment</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/#how">How it works</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-stone-500">
                Free. No account required to get started.
              </p>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative aspect-square w-full max-w-md rounded-[var(--radius-card)] bg-gradient-to-br from-leaf-200 via-leaf-400 to-leaf-700 shadow-xl">
                <div className="absolute inset-6 rounded-[calc(var(--radius-card)-0.4rem)] bg-white/85 p-6 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-widest text-leaf-700">
                    Sample report
                  </p>
                  <p className="mt-1 text-2xl font-bold">0.34 acre · 18% max slope</p>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-center gap-3 rounded-xl bg-leaf-50 p-3">
                      <span className="text-xl">✅</span>
                      <span>
                        <strong>Husqvarna 450X NERA</strong> — handles slope easily, RTK ready.
                      </span>
                    </li>
                    <li className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
                      <span className="text-xl">⚠️</span>
                      <span>
                        <strong>Segway Navimow H800E</strong> — borderline on slope.
                      </span>
                    </li>
                    <li className="flex items-center gap-3 rounded-xl bg-rose-50 p-3">
                      <span className="text-xl">❌</span>
                      <span>
                        <strong>Worx Landroid M</strong> — gate too narrow for charger return.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">How it works</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Three quick steps. One confident decision.
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-6"
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="text-3xl">{step.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-stone-700">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y border-stone-200 bg-stone-50 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
            <p className="text-sm text-stone-600">
              Recommendations cover{" "}
              <strong className="text-stone-900">15+ brands</strong> including Husqvarna, Segway
              Navimow, Mammotion, ECOVACS, eufy, Worx, and Stihl.
            </p>
            <p className="text-sm text-stone-600">
              Install &amp; service handled by{" "}
              <a
                href="https://zippylawnz.com"
                className="font-semibold text-leaf-700 underline-offset-4 hover:underline"
              >
                ZippyLawnz
              </a>
              .
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
            <dl className="mt-10 divide-y divide-stone-200">
              {FAQ.map((item) => (
                <div key={item.q} className="py-6">
                  <dt className="text-lg font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-stone-700">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-leaf-600 py-16 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to mow less and live more?
            </h2>
            <p className="mt-3 text-leaf-50">
              Start your free assessment now. No account needed until you want one.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link href="/assessment">Start your assessment</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
