import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Robotic Lawnz collects, uses, and protects your data.",
};

const LAST_UPDATED = "May 1, 2026";

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">Legal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-stone-500">Last updated {LAST_UPDATED}</p>

        <div className="prose-rl mt-10 space-y-6 text-stone-800 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-leaf-700 [&_a]:underline-offset-4 hover:[&_a]:underline">
          <p>
            Robotic Lawnz (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is a sub-brand of
            ZippyLawnz, Inc. We help U.S. homeowners pick, install, and live with robotic lawn
            mowers. This policy explains what data we collect when you use the Robotic Lawnz
            assessment tool, how we use it, and the choices you have.
          </p>

          <h2>1. Information we collect</h2>
          <p>When you complete an assessment we collect:</p>
          <ul>
            <li>
              <strong>Address and approximate coordinates</strong> — used to display your property
              from satellite imagery and to compute your yard&apos;s area.
            </li>
            <li>
              <strong>Yard outline (a polygon over satellite imagery)</strong> — used to compute
              your mowable area.
            </li>
            <li>
              <strong>Phone motion-sensor readings</strong> — only if you grant permission to
              measure slope. We store the angle reading; we do <em>not</em> store continuous
              orientation data.
            </li>
            <li>
              <strong>Photos of your grass</strong> — only if you upload one. The photo is sent to
              an automated classifier and stored privately on Cloudflare R2 to support that
              classification.
            </li>
            <li>
              <strong>Free-text notes you provide</strong> at any step (e.g. obstacle notes,
              consultation request notes).
            </li>
            <li>
              <strong>Account info from Clerk</strong> — email and Clerk user ID — only if you
              create an account.
            </li>
            <li>
              <strong>Standard server logs</strong> — IP, user agent, timestamps — kept for
              security and rate-limiting purposes for up to 30 days.
            </li>
          </ul>

          <h2>2. Computer-vision processing</h2>
          <p>
            We use machine-learning models (currently Meta&apos;s SAM 2 for lawn segmentation and
            an internal classifier for grass species) accessed through Replicate. The captured map
            tile and click points are sent to those models for inference. Replicate processes the
            request and returns the result to us; they do not retain the data for their own
            purposes per their terms.
          </p>

          <h2>3. How we use your information</h2>
          <ul>
            <li>To compute mower recommendations for your yard.</li>
            <li>
              To forward your assessment to a ZippyLawnz advisor when you explicitly request a
              consultation via the lead-capture form.
            </li>
            <li>
              To improve our recommendation engine and detection accuracy. We may use
              de-identified, aggregated data (e.g. average yard size by region) for internal
              analytics. We do not sell user-level data.
            </li>
            <li>To detect and prevent abuse.</li>
          </ul>

          <h2>4. How we share your information</h2>
          <p>We share data with the following processors only as necessary to operate the service:</p>
          <ul>
            <li>
              <strong>ZippyLawnz</strong> — your parent fulfillment partner. We share the
              assessment + your contact details only after you submit the consultation request.
            </li>
            <li>
              <strong>Clerk</strong> — account authentication.
            </li>
            <li>
              <strong>Mapbox &amp; Google Maps</strong> — base-map and geocoding (server-side).
            </li>
            <li>
              <strong>Replicate</strong> — ML inference (lawn segmentation + grass classification).
            </li>
            <li>
              <strong>Cloudflare R2</strong> — photo storage.
            </li>
            <li>
              <strong>Resend</strong> — transactional email (your confirmation, sales notification).
            </li>
            <li>
              <strong>Sentry</strong> — error monitoring (no PII transmitted by default).
            </li>
            <li>
              <strong>PostHog</strong> — product analytics. PostHog runs only after you accept
              cookies; before then we collect no analytics.
            </li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2>5. Your choices</h2>
          <ul>
            <li>
              <strong>Cookies.</strong> The cookie banner lets you accept or decline non-essential
              analytics cookies at any time.
            </li>
            <li>
              <strong>Account deletion.</strong> Authenticated users can delete saved assessments
              from the &quot;My yards&quot; dashboard.
            </li>
            <li>
              <strong>Email or full deletion.</strong> Email{" "}
              <a href="mailto:privacy@roboticlawnz.com">privacy@roboticlawnz.com</a> to request
              deletion of all data associated with your email or session.
            </li>
            <li>
              <strong>Permissions.</strong> Motion-sensor and camera access are requested via your
              browser; you can deny them at any time and proceed with manual entry.
            </li>
          </ul>

          <h2>6. Data retention</h2>
          <p>
            Assessment data is retained until you delete it or 24 months after the last activity,
            whichever comes first. Lead records are retained for ZippyLawnz&apos;s commercial
            recordkeeping per its own privacy policy.
          </p>

          <h2>7. Children</h2>
          <p>
            Robotic Lawnz is not directed at children under 13. We do not knowingly collect data
            from children. If you believe a child has submitted personal information, contact us
            and we&apos;ll delete it.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update this policy. Material changes will be announced on the home page and
            sent by email to account holders. Continued use after the effective date constitutes
            acceptance.
          </p>

          <h2>9. Contact</h2>
          <p>
            <a href="mailto:privacy@roboticlawnz.com">privacy@roboticlawnz.com</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
