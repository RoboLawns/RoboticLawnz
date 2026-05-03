import { notFound } from "next/navigation";
import Link from "next/link";

interface CareInfo {
  label: string;
  value: string;
}

interface SpeciesData {
  slug: string;
  name: string;
  scientific: string;
  description: string;
  care: CareInfo[];
  seasonal: string;
}

const DATA: Record<string, SpeciesData> = {
  bermuda: {
    slug: "bermuda",
    name: "Bermuda",
    scientific: "Cynodon dactylon",
    description:
      "Bermuda grass is a warm-season turfgrass known for exceptional drought tolerance and quick recovery from damage. It thrives in full sun and is the most widely used turfgrass across the southern United States. Its fine-to-medium texture and dense growth make it ideal for high-traffic lawns, sports fields, and golf courses. Bermuda goes dormant and turns brown in winter but greens up quickly when soil temperatures rise above 65°F.",
    care: [
      { label: "Mowing height", value: "0.5–1.5 in (hybrid), 1–2 in (common)" },
      { label: "Mowing frequency", value: "Every 4–7 days during peak growth" },
      { label: "Watering", value: "1 inch per week, deep and infrequent" },
      { label: "Fertilizer", value: "3–5 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun (8+ hours), very little shade tolerance" },
      { label: "Soil", value: "Well-drained sandy loam, pH 6.0–7.0" },
      { label: "Climate", value: "USDA zones 7–10, southern U.S." },
      { label: "Traffic", value: "Excellent — among the most wear-tolerant" },
      { label: "Drought", value: "Excellent — deep roots survive dry periods" },
    ],
    seasonal:
      "Spring: scalp to remove dead material, apply pre-emergent at 55°F soil temp. Summer: maintain frequent mowing, water deeply. Fall: reduce nitrogen to prepare for dormancy.",
  },
  "kentucky-bluegrass": {
    slug: "kentucky-bluegrass",
    name: "Kentucky Bluegrass",
    scientific: "Poa pratensis",
    description:
      "Kentucky Bluegrass is the quintessential cool-season lawn grass, prized for its rich blue-green color, soft texture, and ability to spread via underground rhizomes. It forms the densest, most carpet-like lawn and thrives in northern climates with cool summers and cold winters.",
    care: [
      { label: "Mowing height", value: "2.0–3.5 in" },
      { label: "Mowing frequency", value: "Every 5–7 days during growth" },
      { label: "Watering", value: "1–1.5 inches per week, deep 2–3x" },
      { label: "Fertilizer", value: "3–4 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun to light shade (6+ hours)" },
      { label: "Soil", value: "Well-drained fertile loam, pH 6.0–7.0" },
      { label: "Climate", value: "USDA zones 3–7, northern U.S." },
      { label: "Traffic", value: "Moderate — recovers via rhizomes" },
      { label: "Drought", value: "Poor-moderate — goes dormant, usually recovers" },
    ],
    seasonal:
      "Spring: pre-emergent when forsythia blooms. Summer: raise mowing height, water deeply during heat. Fall: core aerate, overseed, heaviest fertilizer. Winter: minimize traffic on frozen turf.",
  },
  "tall-fescue": {
    slug: "tall-fescue",
    name: "Tall Fescue",
    scientific: "Festuca arundinacea",
    description:
      "Tall Fescue is a durable cool-season grass with a deep root system (up to 3 feet) providing exceptional heat and drought tolerance. Its coarse texture and clumping habit make it a practical choice across the transition zone where both warm and cool-season grasses struggle.",
    care: [
      { label: "Mowing height", value: "2.5–4.0 in" },
      { label: "Mowing frequency", value: "Weekly in spring/fall, 10–14 days in summer" },
      { label: "Watering", value: "1 inch per week, less frequent due to deep roots" },
      { label: "Fertilizer", value: "2–3 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun to moderate shade" },
      { label: "Soil", value: "Wide range including clay, pH 5.5–7.5" },
      { label: "Climate", value: "USDA zones 5–8, transition zone" },
      { label: "Traffic", value: "Good — tough and durable" },
      { label: "Drought", value: "Excellent for cool-season (deep roots)" },
    ],
    seasonal:
      "Spring: pre-emergent and light fertilizer. Summer: raise mowing height, water deeply. Fall: core aerate and overseed to thicken (does not spread). Winter: avoid heavy traffic on dormant turf.",
  },
  "fine-fescue": {
    slug: "fine-fescue",
    name: "Fine Fescue",
    scientific: "Festuca spp.",
    description:
      "Fine Fescue has the finest leaf texture of any lawn species. It includes creeping red, Chewings, hard, and sheep fescue. Prized for exceptional shade tolerance and low maintenance — requires minimal water and fertilizer once established.",
    care: [
      { label: "Mowing height", value: "1.5–3.0 in (or leave unmowed)" },
      { label: "Mowing frequency", value: "Every 10–14 days, or natural meadow" },
      { label: "Watering", value: "0.5–1 inch per week during dry periods" },
      { label: "Fertilizer", value: "1–2 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Best shade tolerance of any lawn grass" },
      { label: "Soil", value: "Well-drained, slightly acidic, pH 5.5–6.5" },
      { label: "Climate", value: "USDA zones 3–7, northern and coastal regions" },
      { label: "Traffic", value: "Poor-fair — does not tolerate wear" },
      { label: "Drought", value: "Good — goes dormant and recovers" },
    ],
    seasonal:
      "Spring: light raking to remove debris. Summer: avoid overwatering. Fall: core aerate and overseed bare patches. Winter: enjoy the winter green color with minimal care.",
  },
  "perennial-ryegrass": {
    slug: "perennial-ryegrass",
    name: "Perennial Ryegrass",
    scientific: "Lolium perenne",
    description:
      "Perennial Ryegrass is the fastest-germinating cool-season grass — emerging in just 5–7 days. It has a fine, glossy leaf texture and forms a dense dark-green lawn. Commonly used for winter overseeding of warm-season lawns and as a nurse grass in seed mixtures.",
    care: [
      { label: "Mowing height", value: "1.5–2.5 in" },
      { label: "Mowing frequency", value: "Every 5–7 days during growth" },
      { label: "Watering", value: "1–1.5 inches per week, consistent" },
      { label: "Fertilizer", value: "3–4 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun to light shade" },
      { label: "Soil", value: "Well-drained fertile, pH 6.0–7.0" },
      { label: "Climate", value: "USDA zones 5–8, cool-season" },
      { label: "Traffic", value: "Good — excellent for athletic fields" },
      { label: "Drought", value: "Poor — shallow roots wilt quickly" },
    ],
    seasonal:
      "Spring: light fertilizer and pre-emergent. Summer: monitor for gray leaf spot. Fall: core aerate and overseed. Winter: in the South, overseed Bermuda when soil temps drop below 70°F.",
  },
  "st-augustine": {
    slug: "st-augustine",
    name: "St. Augustine",
    scientific: "Stenotaphrum secundatum",
    description:
      "St. Augustine is a warm-season grass with broad, coarse blades forming a thick carpet. It is the most shade-tolerant warm-season grass — the go-to choice for Gulf Coast and Florida lawns with tree cover. Thrives in humid coastal climates.",
    care: [
      { label: "Mowing height", value: "2.5–4.0 in (dwarf: 2.0–2.5 in)" },
      { label: "Mowing frequency", value: "Every 7–10 days" },
      { label: "Watering", value: "1–1.5 inches per week" },
      { label: "Fertilizer", value: "3–4 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun to moderate shade (4–6 hours)" },
      { label: "Soil", value: "Fertile well-drained, pH 6.0–7.5" },
      { label: "Climate", value: "USDA zones 8–10, Gulf/Atlantic coasts" },
      { label: "Traffic", value: "Moderate — recovers via aggressive stolons" },
      { label: "Drought", value: "Moderate — better than centipede" },
    ],
    seasonal:
      "Spring: pre-emergent and regular mowing. Summer: watch for chinch bugs near pavement. Fall: reduce nitrogen, raise mowing height for frost prep. Winter: minimize traffic on frosted turf.",
  },
  zoysia: {
    slug: "zoysia",
    name: "Zoysia",
    scientific: "Zoysia spp.",
    description:
      "Zoysia is a warm-season grass prized for its dense, lush carpet that feels like walking on a thick pad. Its slow vertical growth means less mowing. Excels in the transition zone with both summer heat and winter cold tolerance. Spreads via stolons and rhizomes, crowding out weeds.",
    care: [
      { label: "Mowing height", value: "0.5–2.0 in (by variety)" },
      { label: "Mowing frequency", value: "Every 7–14 days (slow growing)" },
      { label: "Watering", value: "0.5–1 inch per week" },
      { label: "Fertilizer", value: "2–3 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun to light shade" },
      { label: "Soil", value: "Wide range, pH 6.0–7.0" },
      { label: "Climate", value: "USDA zones 6–9, transition zone" },
      { label: "Traffic", value: "Excellent — handles heavy use" },
      { label: "Drought", value: "Excellent — deep roots conserve water" },
    ],
    seasonal:
      "Spring: do not scalp, wait for full green-up before fertilizing. Summer: maintain mowing height. Fall: stop fertilizing 6 weeks before frost. Winter: optional ryegrass overseeding for green color.",
  },
  centipede: {
    slug: "centipede",
    name: "Centipede",
    scientific: "Eremochloa ophiuroides",
    description:
      "Centipede is known as the 'lazy man's grass' for exceptionally low maintenance. It grows slowly, needs almost no fertilizer, and thrives in acidic sandy soils where other grasses struggle. Its light apple-green color gives a natural, informal appearance.",
    care: [
      { label: "Mowing height", value: "1.0–2.0 in" },
      { label: "Mowing frequency", value: "Every 10–14 days (slow)" },
      { label: "Watering", value: "0.5–1 inch per week during dry periods" },
      { label: "Fertilizer", value: "0.5–1 lb N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun to light shade" },
      { label: "Soil", value: "Acidic sandy, pH 5.0–6.0" },
      { label: "Climate", value: "USDA zones 7–9, southeastern U.S." },
      { label: "Traffic", value: "Poor — does not recover from wear" },
      { label: "Drought", value: "Poor-fair — shallow roots" },
    ],
    seasonal:
      "Spring: minimal fertilizer after full green-up (May). Summer: water only at wilt signs. Fall: stop all fertilization by September. Winter: avoid traffic on frosted turf, do not overseed.",
  },
  bahia: {
    slug: "bahia",
    name: "Bahia",
    scientific: "Paspalum notatum",
    description:
      "Bahia grass is a tough, low-maintenance warm-season grass built for the Deep South. Originally from South America for erosion control, it now serves large rural properties. Its coarse, open habit and tall seedheads give a natural look. Thrives in sandy infertile soils.",
    care: [
      { label: "Mowing height", value: "2.0–4.0 in" },
      { label: "Mowing frequency", value: "Every 7–14 days" },
      { label: "Watering", value: "0.5 inch per week during dry periods" },
      { label: "Fertilizer", value: "1–2 lbs N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun, very little shade tolerance" },
      { label: "Soil", value: "Sandy acidic, pH 5.0–6.5" },
      { label: "Climate", value: "USDA zones 7–10, Deep South" },
      { label: "Traffic", value: "Good — tough and durable" },
      { label: "Drought", value: "Excellent — among the most drought-tolerant" },
    ],
    seasonal:
      "Spring: mow low once to remove dead material. Summer: stay ahead of seedheads with frequent mowing. Fall: reduce mowing as growth slows. Winter: may brown after frost, greens up in spring.",
  },
  buffalo: {
    slug: "buffalo",
    name: "Buffalo",
    scientific: "Buchloe dactyloides",
    description:
      "Buffalo grass is a native North American prairie grass making an excellent low-maintenance, drought-tolerant lawn. Its fine blue-green leaves and low-growing habit make it popular for eco-friendly and water-conscious landscapes. Modern turf-type varieties offer denser growth.",
    care: [
      { label: "Mowing height", value: "2.0–3.0 in (or leave at 4–6 in)" },
      { label: "Mowing frequency", value: "Every 2–4 weeks during growth" },
      { label: "Watering", value: "0.25–0.5 inch per week" },
      { label: "Fertilizer", value: "0.5–1 lb N per 1,000 sq ft / year" },
      { label: "Sun", value: "Full sun, thins in any shade" },
      { label: "Soil", value: "Alkaline clay loam, pH 6.5–8.5" },
      { label: "Climate", value: "USDA zones 4–9, Great Plains" },
      { label: "Traffic", value: "Moderate-good" },
      { label: "Drought", value: "Excellent — most water-efficient lawn grass" },
    ],
    seasonal:
      "Spring: be patient — greens up later than other species. Summer: minimal maintenance needed. Fall: stop watering to encourage dormancy. Winter: embrace the tan winter prairie look.",
  },
};

export default async function GrassSpeciesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const info = DATA[slug];
  if (!info) notFound();

  return (
    <div>
      <Link
        href="/grass"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-leaf-600 hover:text-leaf-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to all species
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
        {info.name}
      </h1>
      <p className="mt-1 text-sm text-stone-500 italic">{info.scientific}</p>
      <p className="mt-4 text-sm leading-relaxed text-stone-700">
        {info.description}
      </p>

      {/* ── Care table ───────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900">Care Guide</h2>
        <dl className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {info.care.map((item) => (
            <div key={item.label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm font-medium text-stone-600">{item.label}</dt>
              <dd className="text-right text-sm text-stone-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Seasonal tips ─────────────────────────────────────────────── */}
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-semibold text-amber-900">Seasonal Tips</h2>
        <p className="mt-1 text-xs leading-relaxed text-amber-700">
          {info.seasonal}
        </p>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <div className="mt-8 rounded-xl border border-leaf-200 bg-leaf-50 p-5 text-center">
        <p className="text-sm font-semibold text-leaf-800">
          Have {info.name} in your yard?
        </p>
        <p className="mt-1 text-xs text-leaf-600">
          Find the best robotic mower for your grass type.{" "}
          <Link
            href="/assessment"
            className="font-medium underline underline-offset-2"
          >
            Start your assessment →
          </Link>
        </p>
      </div>
    </div>
  );
}
