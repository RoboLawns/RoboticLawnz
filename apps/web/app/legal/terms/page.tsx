import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of ZippyLawnz.",
};

const LAST_UPDATED = "May 1, 2026";

export default function TermsOfServicePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-leaf-700">Legal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-stone-500">Last updated {LAST_UPDATED}</p>

        <div className="prose-rl mt-10 space-y-6 text-stone-800 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-leaf-700 [&_a]:underline-offset-4 hover:[&_a]:underline">
          <p>
            Welcome to ZippyLawnz, a sub-brand of ZippyLawnz, Inc. By using ZippyLawnz
            (&quot;the Service&quot;) you agree to these terms. If you don&apos;t agree, please
            don&apos;t use the Service.
          </p>

          <h2>1. The Service</h2>
          <p>
            ZippyLawnz lets you create an assessment of your yard and receive a ranked list of
            robotic-mower recommendations. Recommendations are advisory only — they are based on
            the data you provide and on manufacturer-published specifications, which may change
            without our knowledge. Always verify a mower&apos;s specifications and your
            yard&apos;s characteristics before purchase or installation.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old and a U.S. resident to use the Service. By using it
            you represent that you meet these requirements.
          </p>

          <h2>3. Your account &amp; data</h2>
          <ul>
            <li>You may use the Service anonymously or create an account through Clerk.</li>
            <li>
              You&apos;re responsible for the accuracy of the information you submit (address,
              gates, slope, grass type, etc.). Inaccurate data may result in inaccurate
              recommendations.
            </li>
            <li>
              You agree not to submit information about a property you are not authorised to
              represent.
            </li>
          </ul>

          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Reverse-engineer, scrape, or stress-test the Service.</li>
            <li>
              Use the Service to harass others, infringe intellectual property, or violate any
              law.
            </li>
            <li>Submit malicious content, including malware or links to malicious sites.</li>
            <li>Attempt to circumvent authentication or rate-limiting.</li>
          </ul>

          <h2>5. Lead-capture &amp; ZippyLawnz</h2>
          <p>
            When you request a consultation, your assessment and contact details are forwarded to
            ZippyLawnz for follow-up. ZippyLawnz&apos;s own terms and privacy policy govern that
            relationship. We don&apos;t provide installation or sale of mowers directly.
          </p>

          <h2>6. Disclaimer of warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the
            fullest extent permitted by law, we disclaim all warranties, express or implied,
            including merchantability, fitness for a particular purpose, and non-infringement.
            Mower recommendations are not guarantees of performance, suitability, or
            installation success.
          </p>

          <h2>7. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, ZippyLawnz, Inc. and its affiliates are not
            liable for indirect, incidental, special, consequential, or punitive damages arising
            out of or related to your use of the Service. Our aggregate liability for any direct
            damages is limited to one hundred U.S. dollars (US $100).
          </p>

          <h2>8. Intellectual property</h2>
          <p>
            All content on zippylawnz.com — software, designs, copy, mower catalog data we
            curate — is owned by ZippyLawnz or its licensors. Manufacturer logos and product
            photography are the property of their respective owners; we use them under
            nominative-fair-use principles to identify products.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate your access if you violate these terms or use the Service
            in a way that may cause us legal or operational harm. You may stop using the Service
            and delete your data at any time.
          </p>

          <h2>10. Governing law</h2>
          <p>
            These terms are governed by the laws of the State of Delaware, without regard to its
            conflict-of-law principles. Any dispute will be resolved in the state or federal
            courts located in Delaware, except where prohibited by applicable consumer-protection
            law.
          </p>

          <h2>11. Changes</h2>
          <p>
            We may update these terms. Material changes will be announced on the home page and
            via email to account holders. Continued use after the effective date constitutes
            acceptance.
          </p>

          <h2>12. Contact</h2>
          <p>
            <a href="mailto:legal@zippylawnz.com">legal@zippylawnz.com</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
