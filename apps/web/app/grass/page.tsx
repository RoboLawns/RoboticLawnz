import Link from "next/link";

const SPECIES_LIST = [
  {
    slug: "bermuda",
    name: "Bermuda",
    scientific: "Cynodon dactylon",
    summary:
      "The most popular warm-season grass in the South. Exceptional drought tolerance and quick recovery from damage.",
    tags: ["Warm-season", "Full sun", "High traffic"],
  },
  {
    slug: "kentucky-bluegrass",
    name: "Kentucky Bluegrass",
    scientific: "Poa pratensis",
    summary:
      "The classic cool-season lawn — dense, soft, and self-repairing via underground rhizomes. The gold standard for northern lawns.",
    tags: ["Cool-season", "Full sun", "Self-repairing"],
  },
  {
    slug: "tall-fescue",
    name: "Tall Fescue",
    scientific: "Festuca arundinacea",
    summary:
      "The durable workhorse of the transition zone. Deep roots (up to 3ft) give it heat and drought tolerance unusual for a cool-season grass.",
    tags: ["Cool-season", "Transition zone", "Deep roots"],
  },
  {
    slug: "fine-fescue",
    name: "Fine Fescue",
    scientific: "Festuca spp.",
    summary:
      "The best choice for shady lawns. Fine leaf texture and very low maintenance — tolerates poor soils and needs minimal fertilizer.",
    tags: ["Cool-season", "Shade tolerant", "Low maintenance"],
  },
  {
    slug: "perennial-ryegrass",
    name: "Perennial Ryegrass",
    scientific: "Lolium perenne",
    summary:
      "Germinates in 5–7 days — the fastest lawn you can grow. Great for overseeding, erosion control, and winter color in the South.",
    tags: ["Cool-season", "Fast establishment", "Athletic fields"],
  },
  {
    slug: "st-augustine",
    name: "St. Augustine",
    scientific: "Stenotaphrum secundatum",
    summary:
      "The best warm-season grass for shade. Broad, coarse blades form a thick carpet popular along the Gulf Coast and Florida.",
    tags: ["Warm-season", "Shade tolerant", "Coastal"],
  },
  {
    slug: "zoysia",
    name: "Zoysia",
    scientific: "Zoysia spp.",
    summary:
      "Dense, lush, and slow-growing — like walking on a thick pad. The premium choice for the transition zone with less mowing required.",
    tags: ["Warm-season", "Transition zone", "Dense growth"],
  },
  {
    slug: "centipede",
    name: "Centipede",
    scientific: "Eremochloa ophiuroides",
    summary:
      "The 'lazy man's grass' — grows slowly, needs almost no fertilizer, and thrives in acidic sandy soils of the Southeast.",
    tags: ["Warm-season", "Low maintenance", "Acidic soil"],
  },
  {
    slug: "bahia",
    name: "Bahia",
    scientific: "Paspalum notatum",
    summary:
      "Tough as nails — built for the Deep South. Handles heat, humidity, drought, and sandy infertile soils better than almost anything.",
    tags: ["Warm-season", "Deep South", "Drought tolerant"],
  },
  {
    slug: "buffalo",
    name: "Buffalo",
    scientific: "Buchloe dactyloides",
    summary:
      "A native North American prairie grass — the most water-efficient lawn available. Perfect for eco-friendly and xeriscape landscapes.",
    tags: ["Warm-season", "Native", "Drought tolerant"],
  },
];

export default function GrassHubPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
          Grass Care Guide
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Everything you need to know about your lawn species — watering,
          mowing, fertilizing, and seasonal tips for a healthier yard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SPECIES_LIST.map((s) => (
          <Link
            key={s.slug}
            href={`/grass/${s.slug}`}
            className="group rounded-xl border border-stone-200 bg-white p-5 transition hover:border-leaf-300 hover:shadow-sm"
          >
            <h2 className="text-base font-semibold text-stone-900 group-hover:text-leaf-700">
              {s.name}
            </h2>
            <p className="mt-0.5 text-xs text-stone-400">{s.scientific}</p>
            <p className="mt-2 text-sm text-stone-600">{s.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-leaf-200 bg-leaf-50 p-6 text-center">
        <p className="text-sm font-semibold text-leaf-800">
          Not sure what grass you have?
        </p>
        <p className="mt-1 text-xs text-leaf-600">
          Our free yard assessment includes AI-powered grass identification from
          a single photo.{" "}
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
