"""Grass species knowledge base — care, characteristics, regional info.

Each entry covers one of the 10 common U.S. lawn species used by the
classifier (plus "Unknown" as a sentinel). Served via the /grass API
endpoint and rendered on the frontend learning hub.
"""

from __future__ import annotations

from typing import TypedDict


class GrassSpeciesInfo(TypedDict):
    slug: str
    name: str
    scientific: str
    description: str
    care_watering: str
    care_mowing: str
    mowing_height_inches: str
    care_fertilizing: str
    sun_requirements: str
    soil_preferences: str
    climate_zones: str
    traffic_tolerance: str
    drought_tolerance: str
    common_problems: str
    best_for: str
    seasonal_tips: str


GRASS_SPECIES: dict[str, GrassSpeciesInfo] = {
    "bermuda": {
        "slug": "bermuda",
        "name": "Bermuda",
        "scientific": "Cynodon dactylon",
        "description": (
            "Bermuda grass is a warm-season turfgrass known for its exceptional "
            "drought tolerance and ability to recover quickly from damage. It "
            "thrives in full sun and is the most widely used turfgrass across the "
            "southern United States. Its fine-to-medium texture and dense growth "
            "habit make it ideal for high-traffic lawns, sports fields, and golf "
            "courses. Bermuda goes dormant and turns brown in winter but greens up "
            "quickly when soil temperatures rise above 65°F."
        ),
        "care_watering": (
            "Water deeply but infrequently — about 1 inch per week during the "
            "growing season. Allow the soil to dry between waterings to encourage "
            "deep root growth. In sandy soils, split into two 0.5-inch sessions "
            "per week. Reduce watering during cooler months when growth slows."
        ),
        "care_mowing": (
            "Mow frequently during peak growth (every 4–7 days in summer). Hybrid "
            "varieties perform best when kept short. Never remove more than 1/3 of "
            "the blade height in a single mowing. Keep mower blades sharp to avoid "
            "shredding the fine leaf blades."
        ),
        "mowing_height_inches": "0.5–1.5 inches (hybrid), 1–2 inches (common)",
        "care_fertilizing": (
            "Apply 3–5 lbs of nitrogen per 1,000 sq ft per year, split into "
            "applications every 4–6 weeks during the growing season. Use a "
            "slow-release formula in spring and fall. Avoid fertilizing when "
            "dormant. A 3-1-2 or 4-1-2 NPK ratio works well."
        ),
        "sun_requirements": "Full sun (8+ hours per day). Tolerates very little shade.",
        "soil_preferences": (
            "Adapts to a wide range of soils but prefers well-drained sandy loam "
            "with pH 6.0–7.0. Tolerates saline soils better than most turfgrasses."
        ),
        "climate_zones": "USDA zones 7–10. Warm-season; thrives in the southern U.S.",
        "traffic_tolerance": "Excellent — one of the most wear-tolerant grasses available.",
        "drought_tolerance": "Excellent — deep root system allows survival through extended dry periods.",
        "common_problems": (
            "Susceptible to spring dead spot, dollar spot, and armyworms. "
            "Aggressive spreading can invade flower beds. Requires significant "
            "sunlight — thinning occurs in even partial shade. Cold sensitivity "
            "limits use north of the transition zone."
        ),
        "best_for": (
            "High-traffic family lawns, sports fields, golf courses, and hot "
            "southern climates with full sun exposure."
        ),
        "seasonal_tips": (
            "Spring: scalp (mow very low) to remove dead material and apply "
            "pre-emergent herbicide when soil temps reach 55°F. Summer: maintain "
            "mowing frequency and water deeply. Fall: reduce nitrogen to help "
            "the grass harden off for winter dormancy."
        ),
    },
    "kentucky-bluegrass": {
        "slug": "kentucky-bluegrass",
        "name": "Kentucky Bluegrass",
        "scientific": "Poa pratensis",
        "description": (
            "Kentucky Bluegrass is the quintessential cool-season lawn grass, "
            "prized for its rich blue-green color, soft texture, and ability to "
            "spread via underground rhizomes that self-repair damaged areas. It "
            "forms the densest, most carpet-like lawn of any species. It excels in "
            "northern climates with cool summers and cold winters, often blended "
            "with perennial ryegrass or fine fescue for faster establishment."
        ),
        "care_watering": (
            "Requires 1–1.5 inches of water per week during active growth. Water "
            "deeply 2–3 times per week rather than light daily sprinkles. During "
            "summer heat, KBG may go dormant if not watered — this is normal and "
            "it will recover when temperatures cool."
        ),
        "care_mowing": (
            "Mow at the higher end of the range during summer heat to reduce "
            "stress. During peak spring and fall growth, mow every 5–7 days. "
            "Never cut more than 1/3 of the blade. Mulching clippings returns "
            "nitrogen to the soil."
        ),
        "mowing_height_inches": "2.0–3.5 inches",
        "care_fertilizing": (
            "Apply 3–4 lbs of nitrogen per 1,000 sq ft per year. Heaviest "
            "feeding should be in September and November for root development. "
            "Light feeding in late spring. Avoid heavy summer fertilization "
            "which promotes disease."
        ),
        "sun_requirements": "Full sun to light shade (6+ hours). Thins in heavy shade.",
        "soil_preferences": (
            "Prefers well-drained, fertile loam with pH 6.0–7.0. Does not "
            "tolerate compacted or poorly drained soils."
        ),
        "climate_zones": "USDA zones 3–7. Cool-season; thrives in the northern U.S.",
        "traffic_tolerance": "Moderate — recovers well from damage via rhizomes but not ideal for heavy traffic.",
        "drought_tolerance": "Poor to moderate — goes dormant during extended drought but usually recovers.",
        "common_problems": (
            "Susceptible to summer patch, necrotic ring spot, dollar spot, and "
            "rust. Grubs and sod webworms can be problematic. Summer heat stress "
            "is the most common issue south of the transition zone."
        ),
        "best_for": (
            "Premium residential lawns in northern climates, parks, and athletic "
            "fields where appearance is prioritized."
        ),
        "seasonal_tips": (
            "Spring: apply pre-emergent crabgrass control when forsythia blooms. "
            "Summer: raise mowing height and water deeply during heat waves. "
            "Fall: core aerate, overseed bare spots, and apply the season's "
            "heaviest fertilizer application. Winter: minimize foot traffic on "
            "frozen turf."
        ),
    },
    "tall-fescue": {
        "slug": "tall-fescue",
        "name": "Tall Fescue",
        "scientific": "Festuca arundinacea",
        "description": (
            "Tall Fescue is a durable cool-season grass known for its deep root "
            "system (up to 3 feet) that provides exceptional heat and drought "
            "tolerance for a cool-season species. Its coarse texture and clumping "
            "growth habit make it a practical choice for lawns across the "
            "transition zone where both warm and cool-season grasses struggle. "
            "Turf-type varieties offer finer texture and denser growth than "
            "traditional pasture types."
        ),
        "care_watering": (
            "Water 1 inch per week during active growth. The deep root system "
            "allows less frequent watering than other cool-season grasses. Once "
            "established, tall fescue can survive extended dry periods by going "
            "dormant, then recovering when moisture returns."
        ),
        "care_mowing": (
            "Mow weekly during spring and fall growth flushes, every 10–14 days "
            "in summer. The higher mowing height shades out weeds and encourages "
            "deeper roots. Use sharp blades — the coarse leaf blades show dull "
            "cuts prominently."
        ),
        "mowing_height_inches": "2.5–4.0 inches",
        "care_fertilizing": (
            "Apply 2–3 lbs of nitrogen per 1,000 sq ft per year. Focus "
            "fertilization in fall (September and November). Light feeding in "
            "spring. Avoid summer nitrogen in hot climates."
        ),
        "sun_requirements": "Full sun to moderate shade. More shade-tolerant than most warm-season grasses.",
        "soil_preferences": (
            "Adapts to a wide range including clay and compacted soils. Prefers "
            "pH 5.5–7.5. The deep roots improve tolerance to poor soils."
        ),
        "climate_zones": "USDA zones 5–8. Ideal for the transition zone (mid-Atlantic, Midwest, upper South).",
        "traffic_tolerance": "Good — tough and durable, but does not spread to fill bare spots.",
        "drought_tolerance": "Excellent for a cool-season grass due to deep root system.",
        "common_problems": (
            "Brown patch is the most serious disease, especially in hot humid "
            "weather. Endophyte-enhanced varieties resist insects. Clumping "
            "habit means bare spots must be reseeded rather than filling in "
            "naturally."
        ),
        "best_for": (
            "Family lawns in the transition zone, low-maintenance lawns, and "
            "areas with inconsistent rainfall or irrigation."
        ),
        "seasonal_tips": (
            "Spring: apply pre-emergent herbicide and light fertilizer. Summer: "
            "raise mowing height, water deeply but infrequently. Fall: core "
            "aerate and overseed to thicken the stand — tall fescue does not "
            "spread. Winter: avoid heavy traffic on dormant turf."
        ),
    },
    "fine-fescue": {
        "slug": "fine-fescue",
        "name": "Fine Fescue",
        "scientific": "Festuca spp. (rubra, ovina, trachyphylla)",
        "description": (
            "Fine Fescue is a group of cool-season grasses with the finest leaf "
            "texture of any lawn species. It includes creeping red fescue, "
            "Chewings fescue, hard fescue, and sheep fescue. Prized for its "
            "exceptional shade tolerance and low maintenance requirements, fine "
            "fescue is often used in shade mixtures and low-input lawns. It "
            "requires minimal fertilizer and water once established."
        ),
        "care_watering": (
            "Water 0.5–1 inch per week during dry periods. Fine fescues are "
            "drought-tolerant once established and prefer drier conditions. "
            "Overwatering promotes disease and weed invasion."
        ),
        "care_mowing": (
            "Can be mowed or left unmowed for a natural meadow look. If mowing, "
            "keep blades sharp — the fine leaves tear easily. Mow every 10–14 "
            "days during growth periods. Minimal mowing is one of its key "
            "advantages."
        ),
        "mowing_height_inches": "1.5–3.0 inches (or leave unmowed as a natural area)",
        "care_fertilizing": (
            "Low fertility requirement — 1–2 lbs of nitrogen per 1,000 sq ft "
            "per year. Over-fertilization causes thatch buildup and disease. "
            "A single fall application is often sufficient."
        ),
        "sun_requirements": "Excellent shade tolerance — the best choice for shady lawns. Tolerates full sun but prefers partial shade.",
        "soil_preferences": (
            "Prefers well-drained, slightly acidic soils (pH 5.5–6.5). Tolerates "
            "sandy and low-fertility soils better than most turfgrasses."
        ),
        "climate_zones": "USDA zones 3–7. Cool-season; thrives in northern and coastal regions.",
        "traffic_tolerance": "Poor to fair — does not tolerate heavy foot traffic or wear.",
        "drought_tolerance": "Good — goes dormant during drought and recovers when moisture returns.",
        "common_problems": (
            "Red thread disease is common in low-nitrogen conditions. Thatch "
            "buildup can occur with over-watering. Does not compete well with "
            "aggressive grasses in full-sun mixes."
        ),
        "best_for": (
            "Shady lawns, low-maintenance landscapes, natural areas, and sites "
            "with poor or sandy soils."
        ),
        "seasonal_tips": (
            "Spring: light raking to remove debris. Summer: avoid overwatering. "
            "Fall: core aerate if soil is compacted and overseed bare patches. "
            "Winter: requires little attention — enjoy the winter green color."
        ),
    },
    "perennial-ryegrass": {
        "slug": "perennial-ryegrass",
        "name": "Perennial Ryegrass",
        "scientific": "Lolium perenne",
        "description": (
            "Perennial Ryegrass is the fastest-germinating cool-season grass, "
            "often emerging in just 5–7 days. It has a fine, glossy leaf texture "
            "and forms a dense, attractive dark-green lawn. Commonly used for "
            "winter overseeding of warm-season lawns in the South and as a "
            "nurse grass in seed mixtures. Its bunch-type growth habit means it "
            "doesn't spread to fill bare spots."
        ),
        "care_watering": (
            "Requires consistent moisture — 1–1.5 inches per week. Shallow root "
            "system means it needs more frequent watering than tall fescue or "
            "Kentucky bluegrass. Do not allow to completely dry out in summer."
        ),
        "care_mowing": (
            "Mow every 5–7 days during active growth. Ryegrass forms a dense "
            "sward that looks best when maintained at moderate height. Sharp "
            "blades are essential — the tough leaf tissue dulls mowers quickly."
        ),
        "mowing_height_inches": "1.5–2.5 inches",
        "care_fertilizing": (
            "Apply 3–4 lbs of nitrogen per 1,000 sq ft per year. Split into "
            "3–4 applications during the growing season. Fall fertilization "
            "is most important for root development."
        ),
        "sun_requirements": "Full sun to light shade. Thins in moderate to heavy shade.",
        "soil_preferences": (
            "Prefers well-drained fertile soils with pH 6.0–7.0. Does not "
            "tolerate waterlogged or very dry conditions well."
        ),
        "climate_zones": "USDA zones 5–8. Cool-season. Susceptible to both extreme heat and extreme cold.",
        "traffic_tolerance": "Good — excellent for athletic fields and high-traffic areas.",
        "drought_tolerance": "Poor — shallow root system means it wilts quickly without irrigation.",
        "common_problems": (
            "Gray leaf spot can be devastating in hot humid weather. Susceptible "
            "to brown patch, red thread, and rust. Winterkill is a problem in "
            "zones 4 and colder. Bunch-type growth means bare spots need reseeding."
        ),
        "best_for": (
            "Athletic fields, overseeding warm-season lawns for winter green "
            "color, quick-establishment lawns, and erosion control."
        ),
        "seasonal_tips": (
            "Spring: light fertilizer and pre-emergent weed control. Summer: "
            "monitor for gray leaf spot during hot humid periods. Fall: core "
            "aerate and overseed. Winter: in the South, overseed Bermuda lawns "
            "with ryegrass for winter color when soil temps drop below 70°F."
        ),
    },
    "st-augustine": {
        "slug": "st-augustine",
        "name": "St. Augustine",
        "scientific": "Stenotaphrum secundatum",
        "description": (
            "St. Augustine is a warm-season grass with broad, coarse leaf blades "
            "that forms a thick, carpet-like lawn through aggressive stolons. It "
            "is the most shade-tolerant warm-season grass, making it the go-to "
            "choice for Gulf Coast and Florida lawns with tree cover. It thrives "
            "in humid coastal climates but struggles in areas with cold winters "
            "or dry conditions."
        ),
        "care_watering": (
            "Needs 1–1.5 inches of water per week during the growing season. "
            "Wilts visibly when thirsty (blades fold), providing a clear signal "
            "to water. Reduce watering during rainy periods — overwatering "
            "promotes gray leaf spot."
        ),
        "care_mowing": (
            "Mow every 7–10 days during active growth. The broad leaves require "
            "sharp mower blades to avoid a ragged, brown appearance. Standard "
            "rotary mowers work well at this height range."
        ),
        "mowing_height_inches": "2.5–4.0 inches (dwarf varieties: 2.0–2.5 inches)",
        "care_fertilizing": (
            "Apply 3–4 lbs of nitrogen per 1,000 sq ft per year. Fertilize "
            "every 6–8 weeks during the growing season. Use a fertilizer with "
            "iron for deep green color. Avoid late-fall fertilization which "
            "increases cold damage risk."
        ),
        "sun_requirements": "Full sun to moderate shade (4–6 hours). The best warm-season choice for shady lawns.",
        "soil_preferences": (
            "Prefers fertile, well-drained soils with pH 6.0–7.5. Tolerates "
            "a wide range including sandy coastal soils. Benefits from organic "
            "matter amendments."
        ),
        "climate_zones": "USDA zones 8–10. Coastal Gulf and Atlantic regions from the Carolinas through Texas and Florida.",
        "traffic_tolerance": "Moderate — recovers well from damage via aggressive stolons.",
        "drought_tolerance": "Moderate — better than centipede, worse than Bermuda. Goes dormant and browns during drought.",
        "common_problems": (
            "Chinch bugs are the most serious pest. Gray leaf spot is common in "
            "humid weather. Take-all root rot in stressed lawns. Cold sensitivity "
            "limits use north of zone 8. Not tolerant of most herbicides — weed "
            "control options are limited."
        ),
        "best_for": (
            "Coastal southern lawns, shady yards in Florida and the Gulf Coast, "
            "and homeowners who prefer a lush, coarse-textured lawn."
        ),
        "seasonal_tips": (
            "Spring: apply pre-emergent herbicide and begin regular mowing. "
            "Summer: monitor for chinch bugs in hot dry areas near pavement. "
            "Fall: reduce nitrogen and raise mowing height to prepare for "
            "potential frost. Winter: minimize traffic on frosted or dormant "
            "turf."
        ),
    },
    "zoysia": {
        "slug": "zoysia",
        "name": "Zoysia",
        "scientific": "Zoysia spp. (japonica, matrella)",
        "description": (
            "Zoysia is a warm-season grass prized for its dense, lush carpet "
            "that feels like walking on a thick pad. Its fine-to-medium texture "
            "and slow vertical growth mean less mowing than other species. Zoysia "
            "excels in the transition zone where it tolerates both summer heat "
            "and moderate winter cold better than Bermuda. It spreads via both "
            "stolons and rhizomes, forming a thick mat that crowds out weeds."
        ),
        "care_watering": (
            "Requires 0.5–1 inch of water per week during active growth. Zoysia's "
            "deep root system provides good drought tolerance once established. "
            "Water deeply when footprints remain visible in the turf."
        ),
        "care_mowing": (
            "Mow every 7–14 days. Zoysia's slow vertical growth is an advantage. "
            "A reel mower produces the cleanest cut on fine-bladed varieties. "
            "Rotary mowers work for coarser types if blades are kept sharp."
        ),
        "mowing_height_inches": "0.5–2.0 inches (depending on variety and desired appearance)",
        "care_fertilizing": (
            "Apply 2–3 lbs of nitrogen per 1,000 sq ft per year. Less than "
            "Bermuda or St. Augustine. Split into 2–3 applications during the "
            "growing season. Over-fertilizing causes excessive thatch."
        ),
        "sun_requirements": "Full sun to light shade. Moderate shade tolerance — better than Bermuda, less than St. Augustine.",
        "soil_preferences": (
            "Tolerates a wide range including clay, sand, and slightly acidic "
            "to alkaline soils (pH 6.0–7.0). Good drainage is important."
        ),
        "climate_zones": "USDA zones 6–9. The go-to choice for the transition zone.",
        "traffic_tolerance": "Excellent — the dense mat handles heavy traffic and recovers well.",
        "drought_tolerance": "Excellent — deep roots and leaf structure conserve water effectively.",
        "common_problems": (
            "Thatch buildup is the most common issue — requires regular dethatching. "
            "Large patch (zoysia patch) disease in cool wet spring/fall conditions. "
            "Slow establishment from plugs or sod means patience is required. Turns "
            "brown earlier in fall and greens up later in spring than Bermuda."
        ),
        "best_for": (
            "Premium residential lawns in the transition zone and upper South, "
            "golf course fairways, and homeowners wanting a dense, weed-resistant "
            "lawn with less mowing."
        ),
        "seasonal_tips": (
            "Spring: do not scalp — raise mower to cut at 1 inch. Wait until "
            "full green-up before fertilizing. Summer: maintain mowing height. "
            "Fall: stop fertilizing 6 weeks before first frost. Optional winter "
            "overseeding with ryegrass for green color, though zoysia's natural "
            "tan winter color is attractive to many."
        ),
    },
    "centipede": {
        "slug": "centipede",
        "name": "Centipede",
        "scientific": "Eremochloa ophiuroides",
        "description": (
            "Centipede grass is known as the 'lazy man's grass' for its "
            "exceptionally low maintenance requirements. This warm-season grass "
            "grows slowly, requires little fertilizer, and thrives in acidic, "
            "low-fertility soils where other grasses struggle. Its light "
            "apple-green color and medium texture give lawns a natural, informal "
            "appearance. It spreads via stolons and is popular across the "
            "southeastern U.S."
        ),
        "care_watering": (
            "Water 0.5–1 inch per week during dry periods. Centipede has a "
            "shallow root system and shows drought stress quickly (wilting, "
            "discoloration). However, overwatering is more dangerous than "
            "underwatering — it promotes root rot and disease."
        ),
        "care_mowing": (
            "Mow every 10–14 days. Centipede's slow growth is its best feature "
            "for low-maintenance lawns. Remove no more than 1/3 of the blade. "
            "Mow at the higher end of the range in partial shade."
        ),
        "mowing_height_inches": "1.0–2.0 inches",
        "care_fertilizing": (
            "Lowest fertility requirement of all lawn grasses — 0.5–1 lb of "
            "nitrogen per 1,000 sq ft per year. A single late-spring application "
            "is often sufficient. Use low-phosphorus fertilizers. Excess nitrogen "
            "causes centipede decline — one of the most common lawn care mistakes."
        ),
        "sun_requirements": "Full sun to light shade. Thins in moderate to heavy shade.",
        "soil_preferences": (
            "Prefers acidic, sandy, low-fertility soils (pH 5.0–6.0). Iron "
            "chlorosis (yellowing) occurs in high-pH soils. Does not tolerate "
            "compacted soils or high foot traffic."
        ),
        "climate_zones": "USDA zones 7–9. Southeastern U.S. from South Carolina through Texas.",
        "traffic_tolerance": "Poor — does not recover well from wear. Not suitable for active play areas.",
        "drought_tolerance": "Poor to fair — shallow roots mean it needs consistent moisture.",
        "common_problems": (
            "Centipede decline is a complex disorder caused by over-fertilization, "
            "overwatering, or high pH. Ground pearls (scale insects) in sandy "
            "soils. Nematodes in deep sand. Iron chlorosis in alkaline conditions. "
            "Cold damage north of zone 7."
        ),
        "best_for": (
            "Low-maintenance lawns in the southeastern U.S., acidic sandy soils, "
            "and homeowners who want to do as little lawn care as possible."
        ),
        "seasonal_tips": (
            "Spring: apply minimal fertilizer after full green-up (usually May). "
            "Summer: water only when grass shows wilt symptoms. Fall: stop all "
            "fertilization by September. Winter: avoid traffic on frosted turf "
            "and do not attempt to overseed — centipede does not compete well "
            "with winter ryegrass."
        ),
    },
    "bahia": {
        "slug": "bahia",
        "name": "Bahia",
        "scientific": "Paspalum notatum",
        "description": (
            "Bahia grass is a tough, low-maintenance warm-season grass built "
            "for the Deep South. Originally introduced from South America for "
            "erosion control and pasture, it has become a popular lawn choice "
            "for large rural properties. Its coarse, open growth habit and "
            "distinctive tall seedheads give it a natural, informal look. It "
            "thrives in sandy, infertile soils and tolerates heat and humidity "
            "better than almost any other lawn grass."
        ),
        "care_watering": (
            "Extremely drought-tolerant once established. Water 0.5 inch per "
            "week during extended dry periods. Deep, extensive root system allows "
            "survival with minimal irrigation. Overwatering causes more problems "
            "than underwatering."
        ),
        "care_mowing": (
            "Mow every 7–14 days during the growing season. The tough seedheads "
            "grow quickly in summer and require frequent cutting to maintain a "
            "tidy appearance. Sharp blades are critical — the fibrous stems dull "
            "mowers rapidly."
        ),
        "mowing_height_inches": "2.0–4.0 inches",
        "care_fertilizing": (
            "Very low fertility needs — 1–2 lbs of nitrogen per 1,000 sq ft per "
            "year. Over-fertilization promotes weeds. A single application in "
            "late spring is often sufficient. Iron supplements help maintain "
            "green color in high-pH soils."
        ),
        "sun_requirements": "Full sun. Tolerates very little shade.",
        "soil_preferences": (
            "Thrives in sandy, acidic, low-fertility soils (pH 5.0–6.5). One of "
            "the best choices for poor, deep-sand soils where other grasses fail."
        ),
        "climate_zones": "USDA zones 7–10. Deep South — Florida, Gulf Coast, southern Georgia and Alabama.",
        "traffic_tolerance": "Good — tough and durable for a pasture-type grass.",
        "drought_tolerance": "Excellent — among the most drought-tolerant lawn species.",
        "common_problems": (
            "The tall, prolific seedheads (June through September) are the main "
            "aesthetic complaint — they give the lawn an unkempt appearance. "
            "Mole crickets can be problematic in sandy soils. Dollar spot and "
            "brown patch in excessively wet conditions. Slow to establish from "
            "seed compared to other species."
        ),
        "best_for": (
            "Large rural lawns, erosion control, low-maintenance landscapes in "
            "the Deep South, and sandy soils that cannot support other species."
        ),
        "seasonal_tips": (
            "Spring: mow low once to remove dead material. Summer: stay ahead of "
            "seedhead production with frequent mowing. Fall: reduce mowing "
            "frequency as growth slows. Winter: may turn brown after frost — "
            "this is normal and the grass will green up in spring."
        ),
    },
    "buffalo": {
        "slug": "buffalo",
        "name": "Buffalo",
        "scientific": "Buchloe dactyloides",
        "description": (
            "Buffalo grass is a native North American prairie grass that makes "
            "an excellent low-maintenance, drought-tolerant lawn. Its fine, "
            "blue-green leaves and low-growing habit (4–6 inches unmowed) make "
            "it popular for eco-friendly and water-conscious landscapes. It was "
            "the primary forage for the American bison — hence its name. Modern "
            "turf-type varieties offer denser growth and richer color than wild "
            "strains."
        ),
        "care_watering": (
            "Extremely drought-tolerant — the most water-efficient lawn grass "
            "available. Requires only 0.25–0.5 inch per week once established. "
            "Overwatering promotes weed invasion and disease. In many climates, "
            "buffalo grass survives on natural rainfall alone."
        ),
        "care_mowing": (
            "Can be mowed or left natural. If mowing, cut every 2–4 weeks during "
            "active growth. Many homeowners leave buffalo grass unmowed for a "
            "soft, meadow-like appearance that reaches 4–6 inches."
        ),
        "mowing_height_inches": "2.0–3.0 inches (or leave unmowed for natural appearance at 4–6 inches)",
        "care_fertilizing": (
            "Very low fertility requirements — 0.5–1 lb of nitrogen per 1,000 "
            "sq ft per year. Over-fertilization is counterproductive, promoting "
            "weeds and reducing drought tolerance. Often no fertilizer is needed "
            "in established lawns."
        ),
        "sun_requirements": "Full sun. Tolerates very little shade — thins quickly with even partial shade.",
        "soil_preferences": (
            "Prefers alkaline, well-drained clay loam soils (pH 6.5–8.5). "
            "Tolerates a wide range but performs poorly in acidic or wet soils. "
            "Excellent choice for high-pH soils in the Great Plains region."
        ),
        "climate_zones": "USDA zones 4–9. Native to the Great Plains — thrives from Texas to Montana.",
        "traffic_tolerance": "Moderate to good — handles foot traffic better than most native grasses.",
        "drought_tolerance": "Excellent — the most drought-tolerant lawn grass in North America.",
        "common_problems": (
            "Slow to establish from seed or plugs — patience required. Weed "
            "competition during establishment is the biggest challenge. Does not "
            "compete well with aggressive introduced grasses. Turns brown early "
            "in fall and greens up late in spring."
        ),
        "best_for": (
            "Water-conscious landscapes, native plant gardens, large rural "
            "properties in the Great Plains region, and eco-friendly lawns."
        ),
        "seasonal_tips": (
            "Spring: patience is key — buffalo grass greens up later than other "
            "grasses. Do not fertilize until fully green. Summer: enjoy minimal "
            "maintenance. Fall: stop watering to encourage dormancy preparation. "
            "Winter: the tan dormant color is a natural characteristic — embrace "
            "the winter prairie look."
        ),
    },
}


def get_species(slug: str) -> GrassSpeciesInfo | None:
    """Look up a species by its URL slug."""
    return GRASS_SPECIES.get(slug)


def get_all_species() -> list[GrassSpeciesInfo]:
    return list(GRASS_SPECIES.values())


__all__ = ["GRASS_SPECIES", "GrassSpeciesInfo", "get_species", "get_all_species"]
